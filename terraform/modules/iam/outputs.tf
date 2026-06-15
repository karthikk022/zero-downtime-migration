output "alb_ingress_role_arn" {
  value = aws_iam_role.alb_ingress_controller.arn
}

output "cluster_autoscaler_role_arn" {
  value = aws_iam_role.cluster_autoscaler.arn
}
