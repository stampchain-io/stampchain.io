#!/bin/bash
# deploy.sh - Unified deployment script for BTCStampsExplorer
#
# Replaces: deploy-local-changes.sh, deploy-local.sh, deploy-prod.sh,
#           unified-deploy.sh, aws-deploy.sh, build-prod.sh
#
# Usage: ./scripts/deploy.sh [MODE] [OPTIONS]
#
# Modes:
#   codebuild    Build via AWS CodeBuild + deploy (DEFAULT)
#   local        Build locally via Docker buildx + push to ECR + deploy
#   deploy-only  Skip build, deploy latest ECR image
#   build-only   Build and push to ECR, don't deploy
#
# Options:
#   --skip-validation    Skip pre/post deploy validation
#   --skip-monitor       Skip deployment monitoring
#   --skip-cache-purge   Skip Cloudflare cache purge
#   --force              Force deploy, skip all checks and prompts
#   --dry-run            Show what would happen without executing
#   --yes                Auto-confirm prompts

set -e

# ---------------------------------------------------------------------------
# Color codes
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
MODE=""
SKIP_VALIDATION=false
SKIP_MONITOR=false
SKIP_CACHE_PURGE=false
FORCE=false
DRY_RUN=false
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    codebuild|local|deploy-only|build-only)
      MODE="$arg" ;;
    --skip-validation)  SKIP_VALIDATION=true ;;
    --skip-monitor)     SKIP_MONITOR=true ;;
    --skip-cache-purge) SKIP_CACHE_PURGE=true ;;
    --force)            FORCE=true; SKIP_VALIDATION=true; AUTO_YES=true ;;
    --dry-run)          DRY_RUN=true ;;
    --yes|-y)           AUTO_YES=true ;;
    --help|-h)
      head -20 "$0" | grep '^#' | sed 's/^# \?//'
      exit 0 ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      echo "Run with --help for usage"
      exit 1 ;;
  esac
done

MODE="${MODE:-codebuild}"

# ---------------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------------
load_env() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_dir="$(dirname "$script_dir")"

  if [ -f "${project_dir}/.env" ]; then
    set -a
    source "${project_dir}/.env"
    set +a
  else
    echo -e "${RED}Error: .env file not found at ${project_dir}/.env${NC}"
    echo "Copy from .env.sample and fill in your values."
    exit 1
  fi
}

load_env

# ---------------------------------------------------------------------------
# AWS Configuration (from .env with sensible defaults matching .env.sample)
# ---------------------------------------------------------------------------
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null)}"
ECR_REPO_NAME="${AWS_ECR_REPO_NAME:-btc-stamps-explorer}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPOSITORY="${ECR_REGISTRY}/${ECR_REPO_NAME}"
IMAGE_TAG="${AWS_DOCKER_IMAGE_TAG:-latest}"
ECS_CLUSTER="${AWS_ECS_CLUSTER_NAME:-stamps-app-prod}"
ECS_SERVICE="${AWS_ECS_SERVICE_NAME:-stamps-app-service}"
CONTAINER_NAME="${AWS_CONTAINER_NAME:-stamps-app-service}"
TASK_FAMILY="${AWS_TASK_FAMILY:-stamps-app-task}"
CODEBUILD_PROJECT="${AWS_CODEBUILD_PROJECT_NAME:-stamps-app-build}"
CPU_UNITS="${AWS_CPU_UNITS:-512}"
MEMORY="${AWS_MEMORY:-1024}"
DESIRED_COUNT="${AWS_DESIRED_COUNT:-2}"
EXECUTION_ROLE="${AWS_ECS_EXECUTION_ROLE:-stamps-app-execution-role}"
TASK_ROLE="${AWS_ECS_TASK_ROLE:-stamps-app-task-role}"
PROD_URL="${APP_PROD_URL:-https://stampchain.io}"

# Secrets Manager ARN for database credentials (DB_USER, DB_PASSWORD, DB_HOST)
# These are injected via ECS secrets, not plaintext environment variables
DB_SECRET_ARN="${AWS_DB_SECRET_ARN:-arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:stamps-app/database-nWZ49V}"
PROD_DOMAIN="${APP_DOMAIN:-stampchain.io}"

# Network
SUBNET_1="${AWS_PUBLIC_SUBNET_1:-}"
SUBNET_2="${AWS_PUBLIC_SUBNET_2:-}"
SECURITY_GROUP="${AWS_ECS_SECURITY_GROUP:-}"

# Versioning
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
VERSION_TAG="prod-${TIMESTAMP}-g${GIT_COMMIT}"

# ---------------------------------------------------------------------------
# Helper: run or dry-run
# ---------------------------------------------------------------------------
run() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] $*${NC}"
    return 0
  fi
  "$@"
}

# ---------------------------------------------------------------------------
# Helper: confirm prompt
# ---------------------------------------------------------------------------
confirm() {
  if [ "$AUTO_YES" = true ]; then return 0; fi
  echo ""
  echo -e "${YELLOW}$1${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || { echo -e "${RED}Aborted.${NC}"; exit 1; }
}

# ---------------------------------------------------------------------------
# Show configuration
# ---------------------------------------------------------------------------
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  BTCStampsExplorer Deploy (mode: ${MODE})${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "  ECR:          ${ECR_REPOSITORY}"
echo -e "  Image Tag:    ${IMAGE_TAG}"
echo -e "  Version Tag:  ${VERSION_TAG}"
echo -e "  Cluster:      ${ECS_CLUSTER}"
echo -e "  Service:      ${ECS_SERVICE}"
echo -e "  Git:          ${GIT_BRANCH} @ ${GIT_COMMIT}"
echo -e "  CPU/Memory:   ${CPU_UNITS} / ${MEMORY}"
[ "$DRY_RUN" = true ] && echo -e "  ${YELLOW}DRY RUN - no changes will be made${NC}"
echo -e "${BLUE}============================================================${NC}"

# ---------------------------------------------------------------------------
# Validate AWS credentials
# ---------------------------------------------------------------------------
validate_aws_credentials() {
  echo -e "${YELLOW}Validating AWS credentials...${NC}"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}[dry-run] Would validate AWS credentials${NC}"
    return 0
  fi
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}Error: AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
  fi
  echo -e "${GREEN}AWS credentials valid (account: ${AWS_ACCOUNT_ID})${NC}"
}

validate_aws_credentials

# ---------------------------------------------------------------------------
# Pre-deploy validation
# ---------------------------------------------------------------------------
pre_deploy_validation() {
  if [ "$SKIP_VALIDATION" = true ]; then
    echo -e "${YELLOW}Skipping pre-deploy validation (--skip-validation)${NC}"
    return 0
  fi

  echo -e "${BLUE}--- Pre-deploy validation ---${NC}"

  # Code quality checks
  if command -v deno >/dev/null 2>&1; then
    echo -e "${YELLOW}Running deno task check...${NC}"
    if ! deno task check >/dev/null 2>&1; then
      echo -e "${RED}Code quality checks FAILED. Fix issues before deploying.${NC}"
      return 1
    fi
    echo -e "${GREEN}Code quality checks passed${NC}"
  else
    echo -e "${YELLOW}deno not found, skipping code quality checks${NC}"
  fi

  # Health check against local server if running
  if curl -sf "http://localhost:8000/api/v2/health" >/dev/null 2>&1; then
    echo -e "${GREEN}Local server health check passed${NC}"
  else
    echo -e "${YELLOW}Local server not running - skipping local validation${NC}"
  fi
}

# ---------------------------------------------------------------------------
# Build via CodeBuild
# ---------------------------------------------------------------------------
build_codebuild() {
  echo -e "${BLUE}--- Building via CodeBuild ---${NC}"

  # Verify project exists
  if [ "$DRY_RUN" = false ]; then
    local project_exists
    project_exists=$(aws codebuild batch-get-projects \
      --names "${CODEBUILD_PROJECT}" \
      --query 'projects[0].name' \
      --output text 2>/dev/null || echo "")
    if [ "$project_exists" = "None" ] || [ -z "$project_exists" ]; then
      echo -e "${RED}Error: CodeBuild project '${CODEBUILD_PROJECT}' does not exist.${NC}"
      exit 1
    fi
    echo -e "${GREEN}CodeBuild project found: ${CODEBUILD_PROJECT}${NC}"
  fi

  # Start build
  echo -e "${YELLOW}Starting CodeBuild...${NC}"
  local build_id
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would start CodeBuild with VERSION_TAG=${VERSION_TAG}${NC}"
    return 0
  fi

  build_id=$(aws codebuild start-build \
    --project-name "${CODEBUILD_PROJECT}" \
    --environment-variables-override "[
      {\"name\":\"AWS_REGION\",\"value\":\"${AWS_REGION}\"},
      {\"name\":\"AWS_ACCOUNT_ID\",\"value\":\"${AWS_ACCOUNT_ID}\"},
      {\"name\":\"ECR_REPOSITORY_NAME\",\"value\":\"${ECR_REPO_NAME}\"},
      {\"name\":\"VERSION_TAG\",\"value\":\"${VERSION_TAG}\"}
    ]" \
    --query 'build.id' \
    --output text)

  echo -e "${GREEN}Build started: ${build_id}${NC}"

  # Poll for completion
  echo -e "${YELLOW}Waiting for build to complete...${NC}"
  local status
  while true; do
    status=$(aws codebuild batch-get-builds \
      --ids "${build_id}" \
      --query 'builds[0].buildStatus' \
      --output text)
    echo -e "  Build status: ${status}"
    if [ "$status" = "SUCCEEDED" ] || [ "$status" = "FAILED" ] || [ "$status" = "STOPPED" ]; then
      break
    fi
    sleep 30
  done

  if [ "$status" != "SUCCEEDED" ]; then
    echo -e "${RED}CodeBuild failed with status: ${status}${NC}"
    echo "Logs: https://console.aws.amazon.com/codesuite/codebuild/projects/${CODEBUILD_PROJECT}/build/${build_id}/logs"
    exit 1
  fi

  echo -e "${GREEN}CodeBuild completed successfully${NC}"

  # Verify image in ECR with retries
  verify_ecr_image
}

# ---------------------------------------------------------------------------
# Verify ECR image exists (with retries for registration lag)
# ---------------------------------------------------------------------------
verify_ecr_image() {
  echo -e "${YELLOW}Verifying image in ECR...${NC}"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would verify ECR image${NC}"
    return 0
  fi

  local retries=5
  local count=0
  while [ $count -lt $retries ]; do
    if aws ecr describe-images \
      --repository-name "${ECR_REPO_NAME}" \
      --image-ids imageTag="${IMAGE_TAG}" >/dev/null 2>&1; then
      echo -e "${GREEN}Image verified: ${ECR_REPO_NAME}:${IMAGE_TAG}${NC}"
      return 0
    fi
    count=$((count + 1))
    if [ $count -lt $retries ]; then
      local delay=$((5 * count))
      echo -e "  Image not found yet, retry ${count}/${retries} in ${delay}s..."
      sleep "$delay"
    fi
  done

  echo -e "${YELLOW}Warning: Could not verify image tag '${IMAGE_TAG}' after ${retries} retries.${NC}"
  echo -e "${YELLOW}The build may have pushed to 'latest' only - continuing.${NC}"
}

# ---------------------------------------------------------------------------
# Build locally via Docker buildx
# ---------------------------------------------------------------------------
build_local() {
  echo -e "${BLUE}--- Building locally via Docker buildx ---${NC}"

  # Verify Docker is running
  if [ "$DRY_RUN" = false ]; then
    if ! docker info >/dev/null 2>&1; then
      echo -e "${RED}Error: Docker is not running.${NC}"
      exit 1
    fi
    echo -e "${GREEN}Docker is running${NC}"
  fi

  # Setup buildx builder
  local builder_name="stamps-builder"
  if [ "$DRY_RUN" = false ]; then
    if ! docker buildx ls 2>/dev/null | grep -q "${builder_name}"; then
      echo -e "${YELLOW}Creating buildx builder...${NC}"
      docker buildx create --name "${builder_name}" --driver docker-container --use
      docker buildx inspect --bootstrap
    else
      docker buildx use "${builder_name}"
    fi
  fi

  # ECR Login
  echo -e "${YELLOW}Logging into ECR...${NC}"
  if [ "$DRY_RUN" = false ]; then
    aws ecr get-login-password --region "${AWS_REGION}" | \
      docker login --username AWS --password-stdin "${ECR_REGISTRY}"
  fi

  # Build and push (linux/arm64 for Graviton Fargate)
  echo -e "${YELLOW}Building image for linux/arm64...${NC}"
  echo -e "${BLUE}This may take 3-8 minutes on first build (registry caching enabled).${NC}"

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_dir="$(dirname "$script_dir")"

  # ── Local-build safety guard ──
  # 2026-05-14 incident: a local-built image segfaulted on ECS startup (exit
  # 139) intermittently — same image had non-deterministic outcomes (2 of 3
  # tasks SIGSEGV, 1 ran fine). Root cause undiagnosed (likely a Fresh/Deno
  # boot-time race that doesn't surface under CodeBuild's slightly different
  # layer-cache layout). Because :latest was overwritten before the crash was
  # detected, recovery required re-tagging from a known-good digest.
  #
  # To prevent recurrence: build to a temporary ECR tag first, run the image
  # locally 3 times, refuse to retag :latest if any run exits with code 139
  # (SIGSEGV) within 30 seconds. The 3-iteration loop catches a ~67%-per-run
  # crash rate with ~96% confidence. Local container runs without DB/Redis env
  # so non-139 exit codes are expected (DB connect fails) and treated as
  # inconclusive-but-acceptable; only 139 specifically fails the guard.
  local SMOKE_TAG_SUFFIX="smoke-${TIMESTAMP}"
  local SMOKE_TAG="${ECR_REPOSITORY}:${SMOKE_TAG_SUFFIX}"

  run docker buildx build \
    --platform linux/arm64 \
    --tag "${SMOKE_TAG}" \
    --cache-from "type=registry,ref=${ECR_REPOSITORY}:buildcache" \
    --cache-to "type=registry,ref=${ECR_REPOSITORY}:buildcache,mode=max" \
    --push \
    --progress=plain \
    "${project_dir}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would smoke-test ${SMOKE_TAG} then retag :latest + :${VERSION_TAG}${NC}"
    return 0
  fi

  echo -e "${YELLOW}Smoke-testing built image (3 × 30s local runs, SIGSEGV detection)...${NC}"
  if ! docker pull --platform=linux/arm64 "${SMOKE_TAG}" >/dev/null 2>&1; then
    echo -e "${RED}Failed to pull ${SMOKE_TAG} for smoke test.${NC}"
    exit 1
  fi

  local smoke_passed=true
  local i
  for i in 1 2 3; do
    local container_name="stamps-smoke-${TIMESTAMP}-${i}"
    docker run -d --rm --name "${container_name}" --entrypoint sh "${SMOKE_TAG}" \
      -c "deno run \$DENO_PERMISSIONS main.ts" >/dev/null 2>&1 || \
      docker run -d --name "${container_name}" "${SMOKE_TAG}" >/dev/null
    sleep 30
    local status exit_code
    status=$(docker inspect --format='{{.State.Status}}' "${container_name}" 2>/dev/null || echo "missing")
    exit_code=$(docker inspect --format='{{.State.ExitCode}}' "${container_name}" 2>/dev/null || echo "?")
    if [ "$status" = "running" ]; then
      echo -e "  iter $i: ${GREEN}running after 30s — pass${NC}"
      docker stop "${container_name}" >/dev/null 2>&1
    elif [ "$exit_code" = "139" ]; then
      echo -e "  iter $i: ${RED}SIGSEGV (exit 139) within 30s — FAIL${NC}"
      smoke_passed=false
      echo "  ───── container logs ─────"
      docker logs "${container_name}" 2>&1 | tail -40 | sed 's/^/    /'
      echo "  ───── end logs ─────"
    else
      echo -e "  iter $i: ${YELLOW}exit ${exit_code} (status=${status}) — inconclusive (likely env-related, allowing)${NC}"
    fi
    docker rm "${container_name}" >/dev/null 2>&1 || true
  done

  if [ "$smoke_passed" = false ]; then
    echo -e "${RED}Smoke test FAILED — refusing to retag ${IMAGE_TAG}.${NC}"
    echo -e "${YELLOW}Built image is still available at ${SMOKE_TAG} for inspection.${NC}"
    echo -e "${YELLOW}To investigate: docker pull --platform=linux/arm64 ${SMOKE_TAG} && docker run --rm -it ${SMOKE_TAG}${NC}"
    exit 1
  fi

  echo -e "${GREEN}Smoke test passed (3/3). Retagging in ECR...${NC}"
  local smoke_manifest
  smoke_manifest=$(aws ecr batch-get-image \
    --region "${AWS_REGION}" \
    --repository-name "${ECR_REPO_NAME}" \
    --image-ids imageTag="${SMOKE_TAG_SUFFIX}" \
    --query 'images[0].imageManifest' \
    --output text)
  if [ -z "$smoke_manifest" ] || [ "$smoke_manifest" = "None" ]; then
    echo -e "${RED}Could not fetch manifest for ${SMOKE_TAG_SUFFIX} from ECR.${NC}"
    exit 1
  fi

  aws ecr put-image \
    --region "${AWS_REGION}" \
    --repository-name "${ECR_REPO_NAME}" \
    --image-tag "${IMAGE_TAG}" \
    --image-manifest "$smoke_manifest" >/dev/null
  aws ecr put-image \
    --region "${AWS_REGION}" \
    --repository-name "${ECR_REPO_NAME}" \
    --image-tag "${VERSION_TAG}" \
    --image-manifest "$smoke_manifest" >/dev/null

  aws ecr batch-delete-image \
    --region "${AWS_REGION}" \
    --repository-name "${ECR_REPO_NAME}" \
    --image-ids imageTag="${SMOKE_TAG_SUFFIX}" >/dev/null 2>&1 || true

  echo -e "${GREEN}Image built, smoke-tested, and tagged as ${IMAGE_TAG} + ${VERSION_TAG} in ECR${NC}"
}

# ---------------------------------------------------------------------------
# Build environment variables JSON for task definition
# Filters out infra-only variables that shouldn't be in the container
# ---------------------------------------------------------------------------
build_env_json() {
  local env_file="$1"
  local env_vars="["
  local first=true

  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments, empty lines, whitespace-only lines
    [[ "$key" == \#* ]] && continue
    [[ -z "$key" ]] && continue
    [[ "$key" =~ ^[[:space:]]*$ ]] && continue
    [[ -z "$value" ]] && continue

    # Trim leading whitespace from key
    key="${key#"${key%%[![:space:]]*}"}"

    # Filter out infrastructure/deploy-only variables
    [[ "$key" == AWS_* ]] && continue
    [[ "$key" == CLOUDFLARE_* ]] && continue
    [[ "$key" == PUPPETEER_* ]] && continue
    [[ "$key" == ANTHROPIC_API_KEY ]] && continue

    # Filter out database credentials (injected via Secrets Manager, not plaintext)
    [[ "$key" == DB_USER ]] && continue
    [[ "$key" == DB_PASSWORD ]] && continue
    [[ "$key" == DB_HOST ]] && continue

    # QuickNode disabled in production (endpoint suspended; public-API fallback
    # chain handles all UTXO/raw-tx traffic). Filtering these envs out means
    # CommonUTXOService.isQuickNodeConfigured -> false and the entire QuickNode
    # code path is skipped at every call site. To re-enable QuickNode:
    #   1. Remove these two filter lines.
    #   2. Add QUICKNODE_ENDPOINT=<host> to .env (plain).
    #   3. Add QUICKNODE_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...:secret:stamps-app/quicknode-api-key-XXXXXX
    #      to .env. The secrets[] block below picks it up via ${QUICKNODE_API_KEY_SECRET_ARN:+...}.
    [[ "$key" == QUICKNODE_ENDPOINT ]] && continue
    [[ "$key" == QUICKNODE_API_KEY ]] && continue

    # Debug logging stripped in prod (was flooding CloudWatch with HTTP socket
    # internals and per-call Redis lines, contributing to 504 timeouts).
    [[ "$key" == REDIS_DEBUG ]] && continue
    [[ "$key" == REDIS_LOG_LEVEL ]] && continue
    [[ "$key" == NODE_DEBUG ]] && continue

    # Strip quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    if [ "$first" = true ]; then
      first=false
    else
      env_vars="${env_vars},"
    fi
    # Escape any double quotes in value for JSON safety
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    env_vars="${env_vars}{\"name\":\"${key}\",\"value\":\"${value}\"}"
  done < "$env_file"

  # Ensure critical runtime defaults
  if [[ "$env_vars" != *'"CACHE"'* ]]; then
    env_vars="${env_vars},{\"name\":\"CACHE\",\"value\":\"true\"}"
  fi
  if [[ "$env_vars" != *'"SKIP_REDIS"'* ]]; then
    env_vars="${env_vars},{\"name\":\"SKIP_REDIS\",\"value\":\"false\"}"
  fi
  if [[ "$env_vars" != *'"SKIP_REDIS_CONNECTION"'* ]]; then
    env_vars="${env_vars},{\"name\":\"SKIP_REDIS_CONNECTION\",\"value\":\"false\"}"
  fi

  env_vars="${env_vars}]"
  echo "$env_vars"
}

# ---------------------------------------------------------------------------
# Deploy to ECS (register task definition + force new deployment)
# ---------------------------------------------------------------------------
deploy_ecs() {
  echo -e "${BLUE}--- Deploying to ECS (CI-aligned flow) ---${NC}"

  local current_td_file="/tmp/stamps-current-task-def-${TIMESTAMP}.json"
  local new_td_file="/tmp/stamps-new-task-def-${TIMESTAMP}.json"
  local image_uri="${ECR_REPOSITORY}:${IMAGE_TAG}"

  # Mirror .github/workflows/production-deploy.yml: read CURRENT task def from
  # ECS, modify in place (image swap + env scrub + optional secret merge),
  # register a new revision, force-deploy. We do NOT pass --desired-count or
  # --network-configuration so the Application Auto Scaling policy (min=1,
  # max=3, 60% CPU target tracking) and the existing network attachment are
  # preserved across deploys. Env vars are inherited from the existing task
  # def, not rebuilt from local .env — keeping local and CI in lockstep.
  echo -e "${YELLOW}Reading current task definition ${TASK_FAMILY}...${NC}"
  if ! aws ecs describe-task-definition \
        --task-definition "${TASK_FAMILY}" \
        --query 'taskDefinition' \
        > "${current_td_file}"; then
    echo -e "${RED}Error: could not describe current task-definition ${TASK_FAMILY}${NC}"
    exit 1
  fi

  # Container-side transform: image swap, env scrub, optional QUICKNODE secret
  # merge, metadata strip. Driven by env vars to keep the python free of shell
  # interpolation gotchas (no quoting issues for ARN strings, etc).
  CONTAINER_NAME="${CONTAINER_NAME}" \
  IMAGE_URI="${image_uri}" \
  CURRENT_TD_FILE="${current_td_file}" \
  NEW_TD_FILE="${new_td_file}" \
  QUICKNODE_API_KEY_SECRET_ARN="${QUICKNODE_API_KEY_SECRET_ARN:-}" \
  python3 << 'PYEND'
import json
import os

with open(os.environ['CURRENT_TD_FILE']) as f:
    td = json.load(f)

container_name = os.environ['CONTAINER_NAME']
image_uri = os.environ['IMAGE_URI']
qn_secret_arn = os.environ.get('QUICKNODE_API_KEY_SECRET_ARN', '').strip()

# Envs that must never appear in the running container.
# - NODE_DEBUG / REDIS_DEBUG / REDIS_LOG_LEVEL: source of CloudWatch backpressure
#   that contributed to 504s and broken stamp previews.
# - QUICKNODE_ENDPOINT / QUICKNODE_API_KEY: upstream is currently suspended;
#   absence here flips CommonUTXOService.isQuickNodeConfigured -> false so the
#   public-API fallback chain (mempool.space, blockstream.info, blockchain.info,
#   blockcypher) handles all traffic.
# To re-enable QuickNode: remove ENDPOINT from this set, export
# QUICKNODE_API_KEY_SECRET_ARN before running deploy.sh, and set QUICKNODE_ENDPOINT
# back in the task def manually (or temporarily through this script).
SCRUB_KEYS = {
    'NODE_DEBUG',
    'REDIS_DEBUG',
    'REDIS_LOG_LEVEL',
    'QUICKNODE_ENDPOINT',
    'QUICKNODE_API_KEY',
}

found_container = False
for container in td.get('containerDefinitions', []):
    if container.get('name') != container_name:
        continue
    found_container = True

    container['image'] = image_uri

    env = container.get('environment') or []
    scrubbed = [e for e in env if e.get('name') not in SCRUB_KEYS]
    removed = [e['name'] for e in env if e.get('name') in SCRUB_KEYS]
    container['environment'] = scrubbed
    if removed:
        print(f"[scrub] removed envs from container '{container_name}': {removed}")

    if qn_secret_arn:
        secrets = container.get('secrets') or []
        # Idempotent: drop any existing QUICKNODE_API_KEY entry then re-add.
        secrets = [s for s in secrets if s.get('name') != 'QUICKNODE_API_KEY']
        secrets.append({'name': 'QUICKNODE_API_KEY', 'valueFrom': qn_secret_arn})
        container['secrets'] = secrets
        print(f"[secret] added QUICKNODE_API_KEY -> {qn_secret_arn}")

if not found_container:
    raise SystemExit(
        f"container '{container_name}' not found in containerDefinitions"
    )

# Strip read-only metadata not accepted by register-task-definition.
for key in ('taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
            'compatibilities', 'registeredAt', 'registeredBy'):
    td.pop(key, None)

with open(os.environ['NEW_TD_FILE'], 'w') as f:
    json.dump(td, f, indent=2)

print(f"[ok] wrote new task def to {os.environ['NEW_TD_FILE']}")
PYEND

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] New task definition (sensitive valueFrom redacted):${NC}"
    grep -v '"valueFrom":' "${new_td_file}" || true
    rm -f "${current_td_file}" "${new_td_file}"
    return 0
  fi

  # Ensure log group exists (no-op if already there)
  aws logs create-log-group --log-group-name "/aws/ecs/${ECS_CLUSTER}" 2>/dev/null || true

  echo -e "${YELLOW}Registering task definition...${NC}"
  local task_def_arn
  task_def_arn=$(aws ecs register-task-definition \
    --cli-input-json "file://${new_td_file}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

  local revision
  revision=$(echo "$task_def_arn" | awk -F: '{print $NF}')
  echo -e "${GREEN}Task definition registered: ${TASK_FAMILY}:${revision}${NC}"

  # Force a new deployment. Service-level config (desired count, network) is
  # untouched on purpose — autoscaler manages count, network is stable. CI does
  # the same.
  echo -e "${YELLOW}Updating ECS service (force new deployment)...${NC}"
  aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --task-definition "${task_def_arn}" \
    --force-new-deployment \
    --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
    --output table

  echo -e "${GREEN}ECS service updated${NC}"

  # Cleanup old task definitions (keep 5 most recent)
  echo -e "${YELLOW}Cleaning up old task definitions...${NC}"
  local old_defs
  old_defs=$(aws ecs list-task-definitions \
    --family-prefix "${TASK_FAMILY}" \
    --status ACTIVE \
    --sort DESC \
    --query 'taskDefinitionArns[5:]' \
    --output text 2>/dev/null || echo "")

  if [ -n "$old_defs" ] && [ "$old_defs" != "None" ]; then
    for td in $old_defs; do
      aws ecs deregister-task-definition --task-definition "$td" >/dev/null 2>&1 || true
    done
    echo -e "${GREEN}Old task definitions cleaned up${NC}"
  fi

  rm -f "${task_def_file}"
}

# ---------------------------------------------------------------------------
# Monitor ECS deployment (20 min timeout, poll every 30s)
# ---------------------------------------------------------------------------
monitor_deployment() {
  if [ "$SKIP_MONITOR" = true ]; then
    echo -e "${YELLOW}Skipping deployment monitoring (--skip-monitor)${NC}"
    echo "Monitor at: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}"
    return 0
  fi
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would monitor deployment for 20 minutes${NC}"
    return 0
  fi

  echo -e "${BLUE}--- Monitoring deployment (timeout: 20 min) ---${NC}"
  local timeout=1200
  local start_time
  start_time=$(date +%s)
  local cutoff=$((start_time + timeout))

  while [ "$(date +%s)" -lt "$cutoff" ]; do
    local deployments
    deployments=$(aws ecs describe-services \
      --cluster "${ECS_CLUSTER}" \
      --services "${ECS_SERVICE}" \
      --region "${AWS_REGION}" \
      --query 'services[0].deployments' \
      --output json 2>/dev/null)

    local rollout_state desired running
    rollout_state=$(echo "$deployments" | jq -r '.[] | select(.status == "PRIMARY") | .rolloutState')
    desired=$(echo "$deployments" | jq -r '.[] | select(.status == "PRIMARY") | .desiredCount')
    running=$(echo "$deployments" | jq -r '.[] | select(.status == "PRIMARY") | .runningCount')
    local elapsed=$(( $(date +%s) - start_time ))

    echo -e "${BLUE}[${elapsed}s] Rollout: ${rollout_state} | Running: ${running}/${desired}${NC}"

    if [ "$rollout_state" = "COMPLETED" ]; then
      echo -e "${GREEN}Deployment completed successfully!${NC}"
      return 0
    elif [ "$rollout_state" = "FAILED" ]; then
      echo -e "${RED}Deployment FAILED!${NC}"
      echo "Check: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}"
      return 1
    fi

    sleep 30
  done

  echo -e "${YELLOW}Deployment still in progress after $((timeout / 60)) min timeout.${NC}"
  echo "Monitor at: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}"
  return 2
}

# ---------------------------------------------------------------------------
# Purge Cloudflare cache for Fresh build artifacts
# ---------------------------------------------------------------------------
purge_cloudflare_cache() {
  if [ "$SKIP_CACHE_PURGE" = true ]; then
    echo -e "${YELLOW}Skipping Cloudflare cache purge (--skip-cache-purge)${NC}"
    return 0
  fi

  if [ -z "$CLOUDFLARE_ZONE_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}Cloudflare credentials not set - skipping cache purge${NC}"
    echo "Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN in .env to enable."
    return 0
  fi

  echo -e "${YELLOW}Purging Cloudflare cache for Fresh artifacts...${NC}"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would purge prefixes: ${PROD_DOMAIN}/_frsh/, ${PROD_DOMAIN}/_fresh/${NC}"
    return 0
  fi

  local response
  response=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"prefixes\": [\"${PROD_DOMAIN}/_frsh/\", \"${PROD_DOMAIN}/_fresh/\"]}")

  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}Cloudflare cache purged${NC}"
  else
    local err_msg
    err_msg=$(echo "$response" | jq -r '.errors[0].message // "Unknown error"' 2>/dev/null)
    echo -e "${YELLOW}Cache purge may have failed: ${err_msg}${NC}"
  fi

  sleep 5
}

# ---------------------------------------------------------------------------
# Post-deploy validation (health check + smoke test)
# ---------------------------------------------------------------------------
post_deploy_validation() {
  if [ "$SKIP_VALIDATION" = true ]; then
    echo -e "${YELLOW}Skipping post-deploy validation (--skip-validation)${NC}"
    return 0
  fi
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Would run post-deploy health checks${NC}"
    return 0
  fi

  echo -e "${BLUE}--- Post-deploy validation ---${NC}"

  # Wait for new tasks to start serving
  echo -e "${YELLOW}Waiting 10s for new tasks to start serving...${NC}"
  sleep 10

  # Health check
  echo -e "${YELLOW}Checking health endpoint...${NC}"
  local health
  health=$(curl -s --max-time 10 ${PROD_URL}/api/v2/health 2>/dev/null || echo '{}')
  local status
  status=$(echo "$health" | jq -r '.status' 2>/dev/null || echo "unknown")

  if [ "$status" = "OK" ]; then
    echo -e "${GREEN}Health check PASSED${NC}"
  else
    echo -e "${YELLOW}Health check returned: ${status} (site may still be starting)${NC}"
  fi

  # API version smoke test
  echo -e "${YELLOW}Testing API version headers...${NC}"
  local v22_resp v23_resp
  v22_resp=$(curl -s --max-time 10 -H "X-API-Version: 2.2" "${PROD_URL}/api/v2/src20?limit=1" 2>/dev/null || echo "")
  v23_resp=$(curl -s --max-time 10 -H "X-API-Version: 2.3" "${PROD_URL}/api/v2/src20?limit=1" 2>/dev/null || echo "")

  if [ -n "$v22_resp" ] && [ -n "$v23_resp" ]; then
    echo -e "${GREEN}API version endpoints responding${NC}"
  else
    echo -e "${YELLOW}API version endpoints may not be ready yet${NC}"
  fi

  # Newman smoke tests if available
  if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
    echo -e "${YELLOW}Running Newman smoke tests...${NC}"
    if npm run smoke:test 2>/dev/null; then
      echo -e "${GREEN}Newman smoke tests passed${NC}"
    else
      echo -e "${YELLOW}Newman smoke tests failed or not configured${NC}"
    fi
  fi

  echo -e "${GREEN}Post-deploy validation complete${NC}"
}

# ---------------------------------------------------------------------------
# Main execution flow
# ---------------------------------------------------------------------------

confirm "Deploy to production with mode '${MODE}'?"

# Pre-deploy validation (for modes that deploy)
if [ "$MODE" != "build-only" ]; then
  pre_deploy_validation
fi

# Build phase
case "$MODE" in
  codebuild)
    build_codebuild
    ;;
  local)
    build_local
    ;;
  build-only)
    build_codebuild
    echo ""
    echo -e "${GREEN}Build complete. Image: ${ECR_REPOSITORY}:${IMAGE_TAG}${NC}"
    echo -e "${GREEN}Version tag: ${VERSION_TAG}${NC}"
    echo "Run './scripts/deploy.sh deploy-only' to deploy this image."
    exit 0
    ;;
  deploy-only)
    echo -e "${YELLOW}Skipping build (deploy-only mode)${NC}"
    ;;
esac

# Deploy phase
deploy_ecs

# Monitor phase
monitor_deployment
monitor_exit=$?

# Post-deploy phase (only if monitor succeeded or was skipped)
if [ "$monitor_exit" -eq 0 ] || [ "$SKIP_MONITOR" = true ]; then
  purge_cloudflare_cache
  post_deploy_validation
fi

# Summary
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "  Mode:         ${MODE}"
echo -e "  Image:        ${ECR_REPOSITORY}:${IMAGE_TAG}"
echo -e "  Version:      ${VERSION_TAG}"
echo -e "  Cluster:      ${ECS_CLUSTER}"
echo -e "  Service:      ${ECS_SERVICE}"
echo -e "  Console:      https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}"
echo -e "${BLUE}============================================================${NC}"
