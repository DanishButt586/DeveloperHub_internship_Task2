import api from "./api";
import { Document } from "../types";

type DocumentResponse = {
  success: boolean;
  message?: string;
  document: Document;
};

type DocumentsResponse = {
  success: boolean;
  documents: Document[];
};

export const uploadDocument = async (
  file: File,
  version = 1,
): Promise<Document> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("version", String(version));

  const { data } = await api.post<DocumentResponse>(
    "/api/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.document;
};

export const getMyDocuments = async (): Promise<Document[]> => {
  const { data } = await api.get<DocumentsResponse>("/api/documents/my");
  return data.documents;
};

export const getDocumentById = async (
  documentId: string,
): Promise<Document> => {
  const { data } = await api.get<DocumentResponse>(
    `/api/documents/${documentId}`,
  );
  return data.document;
};

export const signDocument = async (
  documentId: string,
  signatureImage: string,
): Promise<Document> => {
  const { data } = await api.post<DocumentResponse>(
    `/api/documents/${documentId}/sign`,
    { signatureImage },
  );

  return data.document;
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/api/documents/${documentId}`);
};
