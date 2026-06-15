#!/usr/bin/env python3
"""
Auto-Healing Failure Simulator
Continuously tests Kubernetes self-healing capabilities and reports results.
"""

import subprocess
import json
import time
import logging
import random
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("auto-healing/logs/simulator.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

NAMESPACE = "production"
SERVICES = ["frontend", "api-gateway", "user-service", "product-service", "order-service"]


def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip(), result.stderr.strip(), result.returncode


def health_check():
    stdout, _, rc = run(
        f"kubectl run health-check-{int(time.time())} --rm -i --restart=Never "
        f"--image=curlimages/curl --command -- curl -s -o /dev/null -w '%{{http_code}}' "
        f"http://api-gateway.{NAMESPACE}:8080/health --connect-timeout 5 2>/dev/null || true"
    )
    return stdout == "200"


def count_ready_pods(service):
    stdout, _, _ = run(
        f"kubectl get pods -n {NAMESPACE} -l app={service} "
        f"-o jsonpath='{{range .items[*]}}{{.status.phase}}{{\"\\n\"}}{{end}}'"
    )
    return stdout.count("Running")


def simulate_pod_kill():
    service = random.choice(SERVICES)
    logger.info(f"🔪 Killing a {service} pod...")

    stdout, _, rc = run(
        f"kubectl get pods -n {NAMESPACE} -l app={service} "
        f"-o jsonpath='{{.items[0].metadata.name}}'"
    )
    if not stdout:
        return False

    pod = stdout
    run(f"kubectl delete pod {pod} -n {NAMESPACE} --force --grace-period=0")
    time.sleep(5)

    before = count_ready_pods(service)
    time.sleep(15)
    after = count_ready_pods(service)

    recovered = after >= before
    logger.info(f"  Pod: {pod} | Before: {before} | After: {after} | Recovered: {recovered}")
    return recovered


def simulate_deployment_scaling():
    service = random.choice(SERVICES)
    logger.info(f"📊 Triggering scaling on {service}...")

    run(f"kubectl scale deployment {service} -n {NAMESPACE} --replicas=0")
    time.sleep(10)
    healthy = health_check()
    logger.info(f"  Health after scale-to-zero: {healthy}")

    run(f"kubectl scale deployment {service} -n {NAMESPACE} --replicas=3")
    time.sleep(20)

    ready = count_ready_pods(service)
    logger.info(f"  Pods after scale-up: {ready}")
    return ready >= 3


def simulate_network_partition():
    logger.info("🌐 Simulating network partition (applying network policy)...")

    deny_all = {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "NetworkPolicy",
        "metadata": {"name": "temp-deny-all", "namespace": NAMESPACE},
        "spec": {
            "podSelector": {"matchLabels": {"app": "api-gateway"}},
            "policyTypes": ["Ingress"],
            "ingress": [],
        },
    }

    manifest = f"/tmp/network-policy-{int(time.time())}.json"
    with open(manifest, "w") as f:
        json.dump(deny_all, f)

    run(f"kubectl apply -f {manifest}")
    time.sleep(5)
    healthy = health_check()
    logger.info(f"  Health after network partition: {healthy}")

    run(f"kubectl delete networkpolicy temp-deny-all -n {NAMESPACE}")
    time.sleep(10)

    recovered = health_check()
    logger.info(f"  Health after recovery: {recovered}")
    return recovered


def generate_report(results):
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    failed = total - passed

    logger.info("\n" + "=" * 60)
    logger.info("AUTO-HEALING TEST REPORT")
    logger.info("=" * 60)
    logger.info(f"Total tests: {total}")
    logger.info(f"Passed: {passed}")
    logger.info(f"Failed: {failed}")
    logger.info(f"Success rate: {(passed / total * 100):.1f}%")
    logger.info("=" * 60)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"auto-healing/logs/report-{timestamp}.json"
    with open(report_file, "w") as f:
        json.dump({
            "timestamp": timestamp,
            "total": total,
            "passed": passed,
            "failed": failed,
            "success_rate": round(passed / total * 100, 1),
            "results": results,
        }, f, indent=2)

    logger.info(f"Report saved to {report_file}")
    return report_file


def main():
    logger.info("🚀 Auto-Healing Failure Simulator Started")
    logger.info("Testing Kubernetes self-healing capabilities...")
    logger.info(f"Namespace: {NAMESPACE}")
    logger.info(f"Services: {', '.join(SERVICES)}")
    logger.info("=" * 60)

    experiments = [
        ("Pod Kill", simulate_pod_kill),
        ("Deployment Scaling", simulate_deployment_scaling),
        ("Network Partition", simulate_network_partition),
    ]

    results = []
    for name, func in experiments:
        logger.info(f"\n📋 Running: {name}")
        try:
            success = func()
            results.append({"test": name, "success": success})
        except Exception as e:
            logger.error(f"  Error: {e}")
            results.append({"test": name, "success": False, "error": str(e)})

    report = generate_report(results)
    logger.info(f"\nFull report: {report}")


if __name__ == "__main__":
    main()
