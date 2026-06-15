output "workspace_id" {
  value = aws_prometheus_workspace.main.id
}

output "workspace_arn" {
  value = aws_prometheus_workspace.main.arn
}

output "workspace_endpoint" {
  value = aws_prometheus_workspace.main.prometheus_endpoint
}

output "grafana_url" {
  value = aws_grafana_workspace.main.endpoint
}

output "grafana_api_key" {
  value     = aws_grafana_workspace_api_key.main.key
  sensitive = true
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
