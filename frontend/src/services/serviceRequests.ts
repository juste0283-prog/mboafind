// Appels API : demandes de service (client + professionnel).
import type { ServiceRequest, ServiceRequestPage } from "../types";
import { api } from "./api";

export async function createServiceRequest(
  serviceId: number,
  message?: string,
): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>("/service-requests", {
    service_id: serviceId,
    message,
  });
  return data;
}

export async function listMyRequests(
  page = 1,
  pageSize = 20,
): Promise<ServiceRequestPage> {
  const { data } = await api.get<ServiceRequestPage>("/service-requests", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function cancelRequest(requestId: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(
    `/service-requests/${requestId}/cancel`,
  );
  return data;
}

// ---------------- Professionnel ----------------

export async function listInboxRequests(
  page = 1,
  pageSize = 20,
): Promise<ServiceRequestPage> {
  const { data } = await api.get<ServiceRequestPage>("/service-requests/inbox", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function acceptRequest(requestId: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(
    `/service-requests/${requestId}/accept`,
  );
  return data;
}

export async function declineRequest(requestId: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(
    `/service-requests/${requestId}/decline`,
  );
  return data;
}

export async function startRequest(requestId: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(
    `/service-requests/${requestId}/start`,
  );
  return data;
}

export async function completeRequest(requestId: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(
    `/service-requests/${requestId}/complete`,
  );
  return data;
}