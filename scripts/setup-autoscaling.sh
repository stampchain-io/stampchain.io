#!/bin/bash
# Setup ECS autoscaling for stamps-app-service
#
# Configures:
# - Desired count: 1 (from 2) — saves ~$18/mo
# - Autoscaling: min 1, max 3, target CPU 60%
# - Deploys still work: rolling deploy temporarily scales to 2, then back to 1
#
# Rollback: aws ecs update-service --cluster stamps-app-prod --service stamps-app-service --desired-count 2
#
# Usage: ./scripts/setup-autoscaling.sh [--dry-run]

set -euo pipefail

CLUSTER="stamps-app-prod"
SERVICE="stamps-app-service"
REGION="us-east-1"
RESOURCE_ID="service/${CLUSTER}/${SERVICE}"

MIN_CAPACITY=1
MAX_CAPACITY=3
TARGET_CPU=60
DESIRED_COUNT=1

DRY_RUN="${1:-}"

echo "=== ECS Autoscaling Setup ==="
echo "Cluster: ${CLUSTER}"
echo "Service: ${SERVICE}"
echo "Desired: ${DESIRED_COUNT} (from 2)"
echo "Autoscale: min=${MIN_CAPACITY}, max=${MAX_CAPACITY}, target CPU=${TARGET_CPU}%"
echo ""

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY RUN] Would execute the following:"
  echo ""
  echo "1. Update service desired count to ${DESIRED_COUNT}"
  echo "2. Register scalable target (min=${MIN_CAPACITY}, max=${MAX_CAPACITY})"
  echo "3. Create target tracking scaling policy (CPU ${TARGET_CPU}%)"
  exit 0
fi

echo "Step 1: Update service desired count to ${DESIRED_COUNT}..."
aws ecs update-service \
  --cluster "${CLUSTER}" \
  --service "${SERVICE}" \
  --desired-count "${DESIRED_COUNT}" \
  --region "${REGION}" \
  --query 'service.{desired:desiredCount,running:runningCount,status:status}' \
  --output table

echo ""
echo "Step 2: Register scalable target..."
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id "${RESOURCE_ID}" \
  --min-capacity "${MIN_CAPACITY}" \
  --max-capacity "${MAX_CAPACITY}" \
  --region "${REGION}"

echo "Registered: min=${MIN_CAPACITY}, max=${MAX_CAPACITY}"

echo ""
echo "Step 3: Create CPU target tracking policy..."
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id "${RESOURCE_ID}" \
  --policy-name "stamps-cpu-target-tracking" \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": '"${TARGET_CPU}"',
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region "${REGION}" \
  --query 'PolicyARN' \
  --output text

echo ""
echo "=== Autoscaling configured ==="
echo "Service will run ${MIN_CAPACITY} task(s) normally, scale to ${MAX_CAPACITY} when CPU > ${TARGET_CPU}%"
echo "Scale-out cooldown: 60s | Scale-in cooldown: 300s"
echo ""
echo "Verify with: aws application-autoscaling describe-scalable-targets --service-namespace ecs --resource-ids ${RESOURCE_ID} --region ${REGION}"
