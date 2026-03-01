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

  run docker buildx build \
    --platform linux/arm64 \
    --tag "${ECR_REPOSITORY}:${IMAGE_TAG}" \
    --tag "${ECR_REPOSITORY}:${VERSION_TAG}" \
    --cache-from "type=registry,ref=${ECR_REPOSITORY}:buildcache" \
    --cache-to "type=registry,ref=${ECR_REPOSITORY}:buildcache,mode=max" \
    --push \
    --progress=plain \
    "${project_dir}"

  echo -e "${GREEN}Image built and pushed to ECR${NC}"
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
  echo -e "${BLUE}--- Deploying to ECS ---${NC}"

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_dir="$(dirname "$script_dir")"
  local env_file="${project_dir}/.env"
  local task_def_file="/tmp/stamps-task-def-${TIMESTAMP}.json"

  # Build env vars from .env
  echo -e "${YELLOW}Building task definition from .env...${NC}"
  local env_json
  env_json=$(build_env_json "$env_file")

  # Validate network config
  if [ -z "$SUBNET_1" ] || [ -z "$SECURITY_GROUP" ]; then
    echo -e "${RED}Error: Network configuration missing.${NC}"
    echo "Set AWS_PUBLIC_SUBNET_1, AWS_PUBLIC_SUBNET_2, AWS_ECS_SECURITY_GROUP in .env"
    exit 1
  fi

  # Create task definition JSON
  cat > "${task_def_file}" << TASKDEF
{
  "family": "${TASK_FAMILY}",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EXECUTION_ROLE}",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${TASK_ROLE}",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "${CONTAINER_NAME}",
      "image": "${ECR_REPOSITORY}:${IMAGE_TAG}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": ${env_json},
      "secrets": [
        {"name": "DB_USER", "valueFrom": "${DB_SECRET_ARN}:username::"},
        {"name": "DB_PASSWORD", "valueFrom": "${DB_SECRET_ARN}:password::"},
        {"name": "DB_HOST", "valueFrom": "${DB_SECRET_ARN}:host::"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/${ECS_CLUSTER}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "stamps-app"
        }
      }
    }
  ],
  "runtimePlatform": {
    "cpuArchitecture": "ARM64",
    "operatingSystemFamily": "LINUX"
  },
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "${CPU_UNITS}",
  "memory": "${MEMORY}"
}
TASKDEF

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[dry-run] Task definition:${NC}"
    cat "${task_def_file}" | grep -v 'DB_PASSWORD\|API_KEY\|SECRET'
    rm -f "${task_def_file}"
    return 0
  fi

  # Ensure log group exists
  aws logs create-log-group --log-group-name "/aws/ecs/${ECS_CLUSTER}" 2>/dev/null || true

  # Register task definition
  echo -e "${YELLOW}Registering task definition...${NC}"
  local task_def_arn
  task_def_arn=$(aws ecs register-task-definition \
    --cli-input-json "file://${task_def_file}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

  local revision
  revision=$(echo "$task_def_arn" | awk -F: '{print $NF}')
  echo -e "${GREEN}Task definition registered: ${TASK_FAMILY}:${revision}${NC}"

  # Build subnet config
  local subnet_config="${SUBNET_1}"
  [ -n "$SUBNET_2" ] && subnet_config="${subnet_config},${SUBNET_2}"

  # Update service
  echo -e "${YELLOW}Updating ECS service...${NC}"
  aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --task-definition "${task_def_arn}" \
    --desired-count "${DESIRED_COUNT}" \
    --network-configuration "awsvpcConfiguration={subnets=[${subnet_config}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=ENABLED}" \
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
