output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_oidc_issuer_url" {
  value = module.eks.cluster_oidc_issuer_url
}

output "node_group_info" {
  value = module.eks.node_group_info
}

output "database_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "database_name" {
  value = module.rds.db_name
}

output "monitoring_workspace_id" {
  value = module.monitoring.workspace_id
}

output "grafana_workspace_url" {
  value = module.monitoring.grafana_url
}
