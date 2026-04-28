import React, { useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { Document as PdfDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, Upload, Trash2, PenLine, Download } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  signDocument,
  deleteDocument,
} from "../../lib/documents";
import { Document as NexusDocument } from "../../types";
import toast from "react-hot-toast";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<NexusDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
      return (
        (error.response?.data as { message?: string } | undefined)?.message ||
        fallback
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  };

  const refreshDocuments = async (nextSelectedDocumentId?: string) => {
    setIsLoading(true);
    try {
      const myDocuments = await getMyDocuments();
      setDocuments(myDocuments);

      const selectedId =
        nextSelectedDocumentId || selectedDocument?.id || myDocuments[0]?.id;

      if (selectedId) {
        const doc = await getDocumentById(selectedId);
        setSelectedDocument(doc);
      } else {
        setSelectedDocument(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load documents."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshDocuments();
  }, []);

  const totalStorageUsed = useMemo(() => {
    return documents.reduce((sum, document) => sum + document.fileSize, 0);
  }, [documents]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(file);
      toast.success("Document uploaded.");
      await refreshDocuments(uploaded.id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Upload failed."));
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSelectDocument = async (documentId: string) => {
    try {
      const doc = await getDocumentById(documentId);
      setSelectedDocument(doc);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to open document."));
    }
  };

  const handleSignClick = () => {
    signatureInputRef.current?.click();
  };

  const handleSignatureFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocument) {
      return;
    }

    const base64Signature = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Unable to encode signature image."));
      };
      reader.onerror = () =>
        reject(new Error("Unable to read signature file."));
      reader.readAsDataURL(file);
    }).catch((error) => {
      toast.error(getErrorMessage(error, "Invalid signature file."));
      return "";
    });

    if (!base64Signature) {
      return;
    }

    setIsSigning(true);
    try {
      await signDocument(selectedDocument.id, base64Signature);
      toast.success("Document signed successfully.");
      await refreshDocuments(selectedDocument.id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to sign document."));
    } finally {
      setIsSigning(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocument(selectedDocument.id);
      toast.success("Document deleted.");
      const nextSelection = documents.find(
        (doc) => doc.id !== selectedDocument.id,
      )?.id;
      await refreshDocuments(nextSelection);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete document."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,.docx"
        className="hidden"
        onChange={handleUploadFileChange}
      />
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSignatureFileChange}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Chamber</h1>
          <p className="text-gray-600">
            Upload, review, sign, and manage your files.
          </p>
        </div>

        <Button
          leftIcon={<Upload size={18} />}
          onClick={handleUploadClick}
          isLoading={isUploading}
        >
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <p className="text-sm text-gray-600">
              Total Files: {documents.length}
            </p>
            <p className="text-sm text-gray-600">
              Used: {formatFileSize(totalStorageUsed)}
            </p>
          </CardBody>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">
                My Documents
              </h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDocument(doc.id)}
                      className={`w-full text-left flex items-center p-4 rounded-lg border transition-colors ${
                        selectedDocument?.id === doc.id
                          ? "border-primary-300 bg-primary-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="p-2 bg-white rounded-lg mr-4 border border-gray-100">
                        <FileText size={22} className="text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{doc.fileType}</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>
                            {new Date(doc.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          doc.status === "SIGNED" ? "success" : "warning"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {selectedDocument && (
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Preview & Actions
                </h2>
                <div className="flex gap-2">
                  <a
                    href={selectedDocument.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Download size={14} />}
                    >
                      Open
                    </Button>
                  </a>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<PenLine size={14} />}
                    onClick={handleSignClick}
                    isLoading={isSigning}
                  >
                    Sign
                  </Button>
                  <Button
                    variant="error"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={handleDeleteDocument}
                    isLoading={isDeleting}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <p>
                    <span className="text-gray-500">Version:</span>{" "}
                    {selectedDocument.version}
                  </p>
                  <p>
                    <span className="text-gray-500">Status:</span>{" "}
                    {selectedDocument.status}
                  </p>
                  <p>
                    <span className="text-gray-500">Type:</span>{" "}
                    {selectedDocument.fileType}
                  </p>
                </div>

                {selectedDocument.fileType === "application/pdf" ? (
                  <div className="border border-gray-200 rounded-lg overflow-auto p-3 bg-gray-50">
                    <PdfDocument file={selectedDocument.fileUrl}>
                      <Page pageNumber={1} width={720} />
                    </PdfDocument>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
                    DOCX preview is not rendered inline. Use Open to
                    view/download the file.
                  </div>
                )}

                {selectedDocument.signatureImage && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Stored Signature
                    </p>
                    <img
                      src={selectedDocument.signatureImage}
                      alt="Document signature"
                      className="h-20 border border-gray-200 rounded bg-white p-2"
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
