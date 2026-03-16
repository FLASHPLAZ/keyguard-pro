import { ManagerLayout } from "@/components/ManagerLayout";
import { Copy, CheckCircle, AlertTriangle, Shield, Zap, BookOpen, Server, Code2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { languages } from "@/data/api-code-snippets";

// Re-export the API docs content with ManagerLayout
// We import the inner content from a shared component
import ApiDocsContent from "@/components/ApiDocsContent";

export default function ManagerApiDocs() {
  return (
    <ManagerLayout>
      <ApiDocsContent />
    </ManagerLayout>
  );
}
