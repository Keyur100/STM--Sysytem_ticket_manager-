import React, { useRef, useState } from "react";
import { Box, Button, Avatar } from "@mui/material";
// ImageUpload flow is commented/stubbed. Implement upload endpoints on backend to enable signed uploads.
// This component returns the file object to parent if signed flow is not implemented.
export default function ImageUpload({ value, onComplete }) {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);

  async function handleFile(f) {
    if (!f) return;
    // Signed upload flow stub (commented)
    // try {
    //   setBusy(true);
    //   const signResp = await api.post('/upload/sign', { name: f.name, type: f.type });
    //   const { uploadUrl, key } = signResp.data || {};
    //   if (uploadUrl) {
    //     await fetch(uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type } });
    //     const completeResp = await api.post('/upload/complete', { key });
    //     const publicUrl = completeResp.data && completeResp.data.url;
    //     setBusy(false);
    //     if (onComplete) onComplete(publicUrl || f);
    //     return;
    //   }
    // } catch (e) {
    //   if (onComplete) onComplete(f);
    // } finally { setBusy(false); }
    if (onComplete) onComplete(f);
  }

  return (
    <Box display="flex" gap={2} alignItems="center">
      <Avatar src={typeof value === "string" ? value : undefined} sx={{ width: 56, height: 56 }} />
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      <Button onClick={() => fileRef.current.click()} disabled={busy}>Upload</Button>
    </Box>
  );
}
