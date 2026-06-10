export function resumeBuilderUrl(applicationId: string, versionId?: string) {
  const params = new URLSearchParams({ application: applicationId });
  if (versionId) params.set("version", versionId);
  return `/resumes?${params.toString()}`;
}

export function interviewPrepUrl(jobId: string) {
  return `/interviews?job=${jobId}`;
}
