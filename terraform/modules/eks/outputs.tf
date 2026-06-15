output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_oidc_issuer_url" {
  value = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "node_group_info" {
  value = {
    node_group_name = aws_eks_node_group.main.node_group_name
    instance_types  = aws_eks_node_group.main.instance_types
    disk_size       = aws_eks_node_group.main.disk_size
  }
}

output "cluster_certificate_authority_data" {
  value = aws_eks_cluster.main.certificate_authority[0].data
}
