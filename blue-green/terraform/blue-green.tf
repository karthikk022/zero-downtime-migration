resource "aws_lb_target_group" "blue" {
  name     = "zero-downtime-blue-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }

  tags = {
    Name = "zero-downtime-blue-tg"
    Color = "blue"
  }
}

resource "aws_lb_target_group" "green" {
  name     = "zero-downtime-green-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }

  tags = {
    Name = "zero-downtime-green-tg"
    Color = "green"
  }
}

resource "aws_lb_listener_rule" "blue_90_green_10" {
  listener_arn = var.alb_listener_arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn

    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = 90
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = 10
      }
      stickiness {
        enabled  = false
        duration = 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

resource "aws_lb_listener_rule" "blue_50_green_50" {
  listener_arn = var.alb_listener_arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn

    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = 50
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = 50
      }
      stickiness {
        enabled  = false
        duration = 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "green_100" {
  listener_arn = var.alb_listener_arn
  priority     = 102

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green.arn
  }

  condition {
    path_pattern {
      values = ["/v2/*"]
    }
  }
}
