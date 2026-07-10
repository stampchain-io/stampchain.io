# Encrypted Environment Backups

SOPS+age encrypted copies of production and dev `.env` files from the AWS EC2 instance (`stampmint3-prod2`).

## Files

| File | Source | Description |
|------|--------|-------------|
| `indexer-prod.env.enc` | `ubuntu@prod2:btc_stamps/indexer/.env` | Production indexer config (RDS, AWS keys, API keys) |
| `stampsdev.env.local.enc` | `ubuntu@prod2:stampsdev/btc_stamps/.env.local` | Dev environment config (local MySQL) |

## Decrypt

Requires the workspace age private key at `~/.config/sops/age/keys.txt`:

```bash
sops decrypt --input-type dotenv --output-type dotenv indexer-prod.env.enc > indexer-prod.env
sops decrypt --input-type dotenv --output-type dotenv stampsdev.env.local.enc > stampsdev.env.local
```

## Updating

After changing secrets on the EC2 instance, pull and re-encrypt:

```bash
scp ubuntu@<prod-ip>:btc_stamps/indexer/.env /tmp/indexer-prod.env
sops encrypt --age age1tjqhdyn4j4yrg2xlktf9wrjda6vk4ey4e9ah6xmf7klre9dkwyjqqyp4la \
  --input-type dotenv --output-type dotenv /tmp/indexer-prod.env > env-backups/indexer-prod.env.enc
rm /tmp/indexer-prod.env
```

Note: SSH requires EC2 Instance Connect (`aws ec2-instance-connect send-ssh-public-key`) — keys are ephemeral (60s).
