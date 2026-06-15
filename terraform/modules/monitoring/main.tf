resource "aws_prometheus_workspace" "main" {
  alias = "${var.name_prefix}-prometheus"

  tags = {
    Name        = "${var.name_prefix}-prometheus"
    Environment = var.environment
  }
}

resource "aws_grafana_workspace" "main" {
  name            = "${var.name_prefix}-grafana"
  account_access  = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type = "SERVICE_MANAGED"
  data_sources    = ["PROMETHEUS", "CLOUDWATCH"]

  tags = {
    Name        = "${var.name_prefix}-grafana"
    Environment = var.environment
  }
}

resource "aws_iam_role" "grafana" {
  name = "${var.name_prefix}-grafana-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "grafana.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role_policy_attachment" "grafana_cloudwatch" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
  role       = aws_iam_role.grafana.name
}

resource "aws_iam_role_policy" "grafana_prometheus" {
  name = "${var.name_prefix}-grafana-prometheus"
  role = aws_iam_role.grafana.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "aps:QueryMetrics",
          "aps:GetLabels",
          "aps:GetSeries",
          "aps:GetMetricMetadata"
        ]
        Resource = aws_prometheus_workspace.main.arn
      }
    ]
  })
}

resource "aws_grafana_workspace_api_key" "main" {
  key_name        = "${var.name_prefix}-grafana-key"
  key_role        = "ADMIN"
  seconds_to_live = 3600 * 24 * 30
  workspace_id    = aws_grafana_workspace.main.id
}

resource "aws_sns_topic" "alerts" {
  name = "${var.name_prefix}-alerts"

  tags = {
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
