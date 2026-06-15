terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  backend "local" {
    path = "environments/minimal/terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  name_prefix = "zero-downtime-${var.environment}"
}

module "s3" {
  source      = "./modules/s3"
  environment = var.environment
  name_prefix = local.name_prefix
}

module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
  name_prefix = local.name_prefix
  azs         = local.azs
  vpc_cidr    = var.vpc_cidr
  single_nat  = var.single_nat
}

module "iam" {
  source      = "./modules/iam"
  environment = var.environment
  name_prefix = local.name_prefix
  oidc_url    = module.eks.cluster_oidc_issuer_url
}

module "rds" {
  source            = "./modules/rds"
  environment       = var.environment
  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  db_instance_class = var.db_instance_class
  db_username       = var.db_username
  db_password       = var.db_password
  multi_az          = var.multi_az

  allowed_security_group_id = module.eks.node_security_group_id
}

module "eks" {
  source         = "./modules/eks"
  environment    = var.environment
  name_prefix    = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  instance_types = var.eks_instance_types
  desired_size   = var.eks_desired_size
  min_size       = var.eks_min_size
  max_size       = var.eks_max_size
}

module "monitoring" {
  source      = "./modules/monitoring"
  environment = var.environment
  name_prefix = local.name_prefix
}
