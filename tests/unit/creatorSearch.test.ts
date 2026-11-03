import { assertEquals, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import { DatabaseSync } from "node:sqlite";
import { SRC101_OWNERS_TABLE } from "$constants";
import type { CreatorSearchResult } from "$lib/types/creator.ts";
import { handler } from "$routes/api/v2/creators/search.ts";
import { CreatorRepository } from "$server/database/creatorRepository.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import { CreatorService } from "$server/services/creator/creatorService.ts";

async function search(query: string): Promise<Response> {
  const request = new Request(
    `https://stampchain.io/api/v2/creators/search?q=${
      encodeURIComponent(query)
    }`,
  );
  return await handler.GET!(request, {} as never);
}

Deno.test("creator search preserves display-name punctuation and spaces", async () => {
  const expected = [{ address: "bc1qtest", name: "Alice O'Neil" }];
  const searchStub = stub(
    CreatorService,
    "searchCreators",
    () => Promise.resolve(expected),
  );
  try {
    const response = await search("  Alice O'Neil  ");
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { data: expected });
    assertEquals(searchStub.calls[0].args, ["Alice O'Neil"]);
  } finally {
    searchStub.restore();
  }
});

Deno.test("creator search leaves empty and overlong queries out of the database", async () => {
  const searchStub = stub(
    CreatorService,
    "searchCreators",
    () => Promise.reject(new Error("Search should not run")),
  );
  try {
    const empty = await search("  ");
    assertEquals(empty.status, 200);
    assertEquals(await empty.json(), { data: [] });
    const overlong = await search("x".repeat(129));
    assertEquals(overlong.status, 400);
    await overlong.body?.cancel();
    assertEquals(searchStub.calls.length, 0);
  } finally {
    searchStub.restore();
  }
});

Deno.test("creator search reports backend failures instead of hiding them as no matches", async () => {
  const searchStub = stub(
    CreatorService,
    "searchCreators",
    () => Promise.reject(new Error("Database unavailable")),
  );
  try {
    const response = await search("alice");
    assertEquals(response.status, 500);
    await response.body?.cancel();
  } finally {
    searchStub.restore();
  }
});

Deno.test("creator repository parameterizes and escapes literal name searches", async () => {
  const expected = [{ address: "bc1qtest", name: "Alice_Smith" }];
  const calls: { sql: string; parameters: unknown[] }[] = [];
  CreatorRepository.setDatabase({
    executeQueryWithCache<T>(sql: string, parameters: unknown[]): Promise<T> {
      calls.push({ sql, parameters });
      return Promise.resolve({ rows: expected } as T);
    },
  });
  try {
    const results = await CreatorRepository.searchCreators(" Alice_Smith%=' ");
    assertEquals(results, expected);
    const { sql, parameters } = calls[0];
    assertEquals(parameters?.[0], "%alice=_smith=%=='%");
    assertEquals(parameters?.[1], parameters?.[0]);
    assertEquals(parameters?.[3], parameters?.[0]);
    assertEquals(parameters?.[4], "alice_smith%='");
    assertStringIncludes(sql, "LIMIT 10");
    assertStringIncludes(sql, "ESCAPE '='");
    assertEquals(sql.includes("Alice_Smith"), false);
  } finally {
    CreatorRepository.setDatabase(dbManager);
  }
});

Deno.test("creator search SQL returns distinct named users and current primary bitnames", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE creator (address TEXT PRIMARY KEY, creator TEXT);
    CREATE TABLE ${SRC101_OWNERS_TABLE} (
      owner TEXT, tokenid_utf8 TEXT, prim INTEGER,
      expire_timestamp INTEGER, last_update INTEGER
    );
  `);
  const creator = db.prepare("INSERT INTO creator VALUES (?, ?)");
  creator.run("custom", "Alice O'Neil");
  creator.run("exact", "ALICE");
  creator.run("underscore", "Alice_Smith");
  creator.run("override", "Custom Artist");
  creator.run("arwyn-wallet", "Arwyn");
  creator.run("vivalavandal-wallet", "VIVALAVANDAL");
  const domain = db.prepare(
    `INSERT INTO ${SRC101_OWNERS_TABLE} VALUES (?, ?, ?, ?, ?)`,
  );
  domain.run("primary", "alice", 1, 2000, 10);
  domain.run("primary", "alice", 1, 2000, 10);
  domain.run("expired", "alice-expired", 1, 900, 10);
  domain.run("secondary", "alice-secondary", 0, 2000, 10);
  domain.run("updated", "alice-old", 1, 2000, 5);
  domain.run("updated", "bob-new", 1, 2000, 10);
  domain.run("override", "alice-alias", 1, 2000, 10);
  CreatorRepository.setDatabase({
    executeQueryWithCache<T>(sql: string, parameters: unknown[]): Promise<T> {
      // Execute the production SQL using SQLite's equivalent concatenation
      // syntax and a fixed clock; selection, joins, ranking and deduplication
      // run unchanged against real tables.
      const sqliteSql = sql.replaceAll("UNIX_TIMESTAMP()", "1000")
        .replaceAll(
          "CONCAT(domains.tokenid_utf8, '.btc')",
          "(domains.tokenid_utf8 || '.btc')",
        );
      const rows = db.prepare(sqliteSql).all(
        ...parameters as (string | number)[],
      ).map((row) => ({ ...row }));
      return Promise.resolve({ rows } as T);
    },
  });
  try {
    const users = await CreatorRepository.searchCreators("alice");
    assertEquals(users, [
      { address: "exact", name: "ALICE" },
      { address: "custom", name: "Alice O'Neil" },
      { address: "primary", name: "alice.btc" },
      { address: "underscore", name: "Alice_Smith" },
      { address: "override", name: "Custom Artist" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("Alice O'Neil"), [
      { address: "custom", name: "Alice O'Neil" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("alice_smith"), [
      { address: "underscore", name: "Alice_Smith" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("alice%"), []);
    assertEquals(await CreatorRepository.searchCreators("alice-old"), []);
    assertEquals(await CreatorRepository.searchCreators("bob-new.btc"), [
      { address: "updated", name: "bob-new.btc" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("alice-alias.btc"), [
      { address: "override", name: "Custom Artist" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("override"), [
      { address: "override", name: "Custom Artist" },
    ]);
    assertEquals(await CreatorRepository.searchCreators("no match"), []);

    // Plain display names are searchable without owning a primary .btc name.
    for (const query of ["ARWYN", "arwyn", "ArWyN", "arw"]) {
      assertEquals(await CreatorRepository.searchCreators(query), [
        { address: "arwyn-wallet", name: "Arwyn" },
      ]);
    }
    for (const query of ["VIVALAVANDAL", "vivalavandal", "vandal"]) {
      assertEquals(await CreatorRepository.searchCreators(query), [
        { address: "vivalavandal-wallet", name: "VIVALAVANDAL" },
      ]);
    }

    for (let i = 0; i < 15; i++) {
      creator.run(`limit${i}`, `Limit Artist ${i}`);
    }
    const capped: CreatorSearchResult[] = await CreatorRepository
      .searchCreators(
        "Limit Artist",
      );
    assertEquals(capped.length, 10);
  } finally {
    CreatorRepository.setDatabase(dbManager);
    db.close();
  }
});
