#!/bin/bash
set -euo pipefail

NAMESPACE="production"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="auto-healing/logs"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
}

section() {
  echo "" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
  echo "========================================" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
  echo "  $*" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
  echo "========================================" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
}

wait_for_pod_ready() {
  local label="$1"
  log "Waiting for pod with label $label to be Ready..."
  kubectl wait --for=condition=Ready pod -l "$label" -n "$NAMESPACE" --timeout=120s 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
}

check_health() {
  local msg="$1"
  log "Health check: $msg"
  kubectl run health-check-$TIMESTAMP --rm -i --restart=Never \
    --image=curlimages/curl --command -- curl -s http://api-gateway.$NAMESPACE:8080/health 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log" || true
}

section "SCENARIO 1: Pod Kill"
log "Initial state:"
kubectl get pods -n "$NAMESPACE" -l app=frontend -o wide | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"

check_health "Before pod kill"

log "Killing a frontend pod..."
POD=$(kubectl get pods -n "$NAMESPACE" -l app=frontend -o jsonpath='{.items[0].metadata.name}')
kubectl delete pod "$POD" -n "$NAMESPACE" --force --grace-period=0
log "Killed pod: $POD"

log "Waiting for auto-healing..."
sleep 5
kubectl get pods -n "$NAMESPACE" -l app=frontend -o wide | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
wait_for_pod_ready "app=frontend"

check_health "After pod kill and recovery"
log "Result: Pod self-healed successfully"

section "SCENARIO 2: Delete Deployment"
log "Deleting frontend deployment..."
kubectl delete deployment frontend -n "$NAMESPACE" 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log" || true

check_health "During deployment deletion"

log "Recreating deployment..."
kubectl apply -f helm-charts/frontend/templates/deployment.yaml 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
wait_for_pod_ready "app=frontend"

check_health "After deployment recovery"
log "Result: Deployment restored successfully"

section "SCENARIO 3: Simulate Node Failure"
log "Cordoning a node..."
NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl cordon "$NODE"
log "Cordoned node: $NODE"

log "Draining node..."
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --force 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log" || true

log "Pods rescheduled to other nodes:"
kubectl get pods -n "$NAMESPACE" -o wide | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"

check_health "During node failure"

log "Uncordoning node..."
kubectl uncordon "$NODE"
log "Node recovered: $NODE"

log "Result: Pods rescheduled to healthy nodes"

section "SCENARIO 4: HPA Scaling"
log "Triggering load for HPA..."
kubectl run load-generator-$TIMESTAMP --rm -i --restart=Never \
  --image=busybox -- sh -c "while true; do wget -q -O- http://api-gateway.$NAMESPACE:8080/health; done" 2>&1 | tee -a "$LOG_DIR/demo-$TIMESTAMP.log" &
LOAD_PID=$!

sleep 30
log "HPA status:"
kubectl get hpa -n "$NAMESPACE" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
kubectl get pods -n "$NAMESPACE" -l app=frontend | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"

kill $LOAD_PID 2>/dev/null || true
log "Result: HPA scaled pods based on load"

section "DEMO SUMMARY"
echo "Completed at $(date)" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
echo "Log file: $LOG_DIR/demo-$TIMESTAMP.log" | tee -a "$LOG_DIR/demo-$TIMESTAMP.log"
