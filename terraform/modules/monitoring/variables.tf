variable "environment" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "alert_email" {
  type    = string
  default = "admin@example.com"
}
