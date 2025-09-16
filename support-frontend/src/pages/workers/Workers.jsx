import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import api from "../../api/axios";

export default function Workers(){
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(()=>{ api.get('/workers').then(r=>setWorkers(r.data)).catch(()=>{}); api.get('/jobs').then(r=>setJobs(r.data)).catch(()=>{}) }, []);

  const requeue = async (jobId)=>{ await api.post(`/jobs/${jobId}/requeue`).catch(()=>{}); alert('Requeued') }

  return (
    <Box p={2}><Paper sx={{p:2}}>
      <h3>Workers</h3>
      {workers.map(w=> <Paper key={w._id} sx={{p:1, my:1}}>{w.workerId} - {w.status}</Paper>)}
      <h3>Jobs</h3>
      {jobs.map(j=> <Paper key={j._id} sx={{p:1, my:1}}>{j.type} - {j.status} <Button onClick={()=>requeue(j._id)}>Requeue</Button></Paper>)}
    </Paper></Box>
  )
}
