variable "environment" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "vpc_cidr" {
  type = string
}

variable "single_nat" {
  type    = bool
  default = false
}
