variable "vpc_id" {
  description = "VPC ID for target groups"
  type        = string
}

variable "alb_listener_arn" {
  description = "ALB listener ARN for weighted routing rules"
  type        = string
}

variable "environment" {
  description = "Environment name for tagging"
  type        = string
  default     = "dev"
}

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "zero-downtime"
}
