import { SRC101Repository } from "$server/database/src101Repository.ts";
import type {
  SRC101OwnerParams, SRC101TokenidsParams, SRC101TxParams, SRC101ValidTxParams, SRC101ValidTxTotalCountParams, Src101BalanceParams
} from "$types/src101.d.ts";

export class SRC101QueryService {
  static async getTotalSrc101TXFromSRC101TableCount(
    params: SRC101TxParams,
  ){
    try{
      return await SRC101Repository.getTotalSrc101TXFromSRC101TableCount(params);
    } catch (error) {
      console.error("Error getting SRC101 Tx From SRC101 Count:", error);
      throw error;
    }
  }

  static async getSrc101TXFromSRC101Table(
    params: SRC101TxParams,
  ){
    try{
      return await SRC101Repository.getSrc101TXFromSRC101Table(params);
    } catch (error) {
      console.error("Error getting SRC101 Tx From SRC101:", error);
      throw error;
    }
  }

  static async getTotalValidSrc101TxCount(
    params:SRC101ValidTxTotalCountParams,
  ){
    try{
      return await SRC101Repository.getTotalValidSrc101TxCount(params);
    } catch (error) {
      console.error("Error getting Valid SRC101 Tx:", error);
      throw error;
    }
  }

  static async getValidSrc101Tx(
    params:SRC101ValidTxParams,
  ){
    try{
      return await SRC101Repository.getValidSrc101Tx(params);
    } catch (error) {
      console.error("Error getting Valid SRC101 Tx:", error);
      throw error;
    }
  }

  static async getSrc101Balance(
    params: Src101BalanceParams,

  ){
    try{
      return await SRC101Repository.getSrc101Balance(params);
    } catch (error) {
      console.error("Error getting Valid SRC101 Tx:", error);
      throw error;
    }
  }

  static async getSrc101BalanceTotalCount(
    params: Src101BalanceParams,

  ){
    try{
      return await SRC101Repository.getSrc101BalanceTotalCount(params);
    } catch (error) {
      console.error("Error getting Valid SRC101 Tx:", error);
      throw error;
    }
  }

  static async getDeployDetails(
    deploy_hash: string,
  ){
    try{
      return await SRC101Repository.getDeployDetails(deploy_hash);
    } catch (error) {
      console.error("Error getting SRC101 owner:", error);
      throw error;
    }
  }

  static async getSrc101Price(
    deploy_hash: string,
  ){
    try{
      return await SRC101Repository.getSrc101Price(deploy_hash);
    } catch (error){
      throw error;
    }
  }

  static async getTotalCount(
    deploy_hash: string,
  ){
    try{
      return await SRC101Repository.getTotalCount(deploy_hash);
    } catch (error) {
      console.error("Error getting SRC101 owner:", error);
      throw error;
    }
  }

  static async getSrc101Owner(
    params:SRC101OwnerParams,
  ){
    try{
      if(params.tokenid){
        params.tokenid = decodeURIComponent(params.tokenid);
        params.tokenid = params.tokenid.replace(/-/g, "+").replace(/_/g, "/");
      }
      return await SRC101Repository.getSrc101Owner(params);
    } catch (error) {
      console.error("Error getting SRC101 owner:", error);
      throw error;
    }
  }

  static async getSrc101OwnerCount(
    params:SRC101OwnerParams,
  ): Promise<number> {
    try{
      if(params.tokenid){
        params.tokenid = decodeURIComponent(params.tokenid);
        params.tokenid = params.tokenid.replace(/-/g, "+").replace(/_/g, "/");
      }
      return await SRC101Repository.getSrc101OwnerCount(params);
    } catch (error) {
      console.error("Error getting SRC101 owner:", error);
      throw error;
    }
  }

  static async getTotalSrc101TokenidsCount(
    params: SRC101TokenidsParams,
  ): Promise<number> {
    try {
      return await SRC101Repository.getTotalSrc101TokenidsCount(params);
    } catch (error) {
      console.error("Error getting total SRC101 tokenids count:", error);
      throw error;
    }
  }

  static async getSrc101Tokenids(
    params: SRC101TokenidsParams,
  ){
    try {
      return await SRC101Repository.getSrc101Tokenids(params);
    } catch (error) {
      console.error("Error getting total SRC101 tokenids count:", error);
      throw error;
    }
  }

  static async getPrimaryDomainForAddress(
    address: string,
  ): Promise<string | null> {
    try {
      return await SRC101Repository.getPrimaryDomainForAddress(address);
    } catch (error) {
      console.error("Error getting primary domain for address:", error);
      throw error;
    }
  }

  static async getDomainsForAddress(
    address: string,
  ): Promise<{ name: string; primary: boolean }[]> {
    try {
      return await SRC101Repository.getDomainsForAddress(address);
    } catch (error) {
      console.error("Error getting domains for address:", error);
      throw error;
    }
  }
}
