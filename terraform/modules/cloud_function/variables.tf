variable "name" {
  description = "Function name"
  type        = string
}

variable "location" {
  description = "Function location"
  type        = string
}

variable "description" {
  description = "Function description"
  type        = string
  default     = ""
}

variable "runtime" {
  description = "Function runtime"
  type        = string
  default     = "nodejs20"
}

variable "entry_point" {
  description = "Function entry point"
  type        = string
}

variable "memory" {
  description = "Available memory"
  type        = string
  default     = "512M"
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 60
}

variable "max_instances" {
  description = "Maximum instances"
  type        = number
  default     = 100
}

variable "min_instances" {
  description = "Minimum instances"
  type        = number
  default     = 0
}

variable "environment_variables" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "source_bucket" {
  description = "GCS bucket containing function source"
  type        = string
}

variable "source_object" {
  description = "GCS object path for function source"
  type        = string
  default     = "function-source.zip"
}

variable "event_triggers" {
  description = "Event triggers"
  type = list(object({
    trigger    = string
    event_type = string
    resource   = string
  }))
  default = []
}
