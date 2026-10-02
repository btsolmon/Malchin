import type { Metadata } from "next";
import ProjectForm from "@/components/ProjectForm";

export const metadata: Metadata = {
  title: "Төслийн танилцуулга — Нүүдэлчин",
  description: "Нүүдэлчин төслийн бүтээгчид, технологи, онцлог болон хөгжүүлэлтийн үйл явц.",
};

export default function ProjectPage() {
  return <ProjectForm />;
}
