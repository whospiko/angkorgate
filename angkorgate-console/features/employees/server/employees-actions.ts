"use server"

import "server-only"
import { apiClient } from "@/lib/api-client"
import type { Department, JobTitle, Employee } from "../types/employees.types"

export async function getDepartments(): Promise<Department[]> {
  try {
    const res = await apiClient.get<Department[]>("/departments")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getJobTitles(): Promise<JobTitle[]> {
  try {
    const res = await apiClient.get<JobTitle[]>("/job-titles")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getEmployees(): Promise<Employee[]> {
  try {
    const res = await apiClient.get<Employee[]>("/employees")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}
