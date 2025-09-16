import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import api from "../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import AddNewModal from "../../components/common/modals/AddNewModal";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function TicketForm() {
  const nav = useNavigate();
  const { id } = useParams(); // check if editing
  const { hasPermission } = usePermissions();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [priority, setPriority] = useState("p3");
  const [selectedTags, setSelectedTags] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [showAddTag, setShowAddTag] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [errors, setErrors] = useState({});

  // Load ticket if editing
  useEffect(() => {
    if (!id) return;
    api
      .get(`/tickets/${id}`)
      .then((res) => {
        const ticket = res.data;
        setTitle(ticket.title);
        setDescription(ticket.description);
        setDepartment(ticket.department?._id || "");
        setAssignedAgentId(ticket.assignedAgentId?._id || "");
        setPriority(ticket.priority || "p3");
        setSelectedTags(ticket.tags?.map((t) => t._id) || []);
      })
      .catch(() => {});
  }, [id]);

  // Fetch departments + tags
  useEffect(() => {
    api
      .get("/departments")
      .then((r) => setDepartments(r.data))
      .catch(() => {});
    api
      .get("/tags")
      .then((r) => setAllTags(r.data))
      .catch(() => {});
  }, []);

  // Fetch agents when department changes
  useEffect(() => {
    if(hasPermission("ticket.assign")){

      if (!department) return setAgents([]);
      api
        .get(`/ticket-assignable-users/${department}`)
        .then((r) => {
          
          setAgents(r.data);
        })
        .catch(() => setAgents([]));
    }
  }, [department]);

  // Validation
  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!description.trim()) errs.description = "Description is required";
    if (!department) errs.department = "Department is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title,
      description,
      department,
      assignedAgentId: hasPermission("ticket.assign")
        ? assignedAgentId
        : undefined,
      tags: selectedTags,
      priority,
    };

    if (id) {
      await api.put(`/tickets/${id}`, payload);
    } else {
      await api.post("/tickets", payload);
    }

    nav("/tickets");
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.department}>
            <InputLabel>Department</InputLabel>
            <Select
              value={department}
              onChange={(e) => {
                if (
                  e.target.value === "add-new" &&
                  hasPermission("department.create")
                )
                  setShowAddDept(true);
                else setDepartment(e.target.value);
              }}
            >
              <MenuItem value="">Select</MenuItem>
              {hasPermission("department.create") && (
                <MenuItem value="add-new">Add New</MenuItem>
              )}
              {departments.map((d) => (
                <MenuItem key={d._id} value={d._id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
            {errors.department && (
              <FormHelperText>{errors.department}</FormHelperText>
            )}
          </FormControl>

          {hasPermission("ticket.assign") && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assigned Agent</InputLabel>
              <Select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                {agents.map((a) => (
                  <MenuItem key={a.userId} value={a.userId}>
                    {a.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={(e) => {
                const vals = Array.from(e.target.value);
                if (
                  vals.includes("add-new") &&
                  hasPermission("tag.create")
                )
                  setShowAddTag(true);
                else setSelectedTags(vals);
              }}
            >
              {hasPermission("tag.create") && (
                <MenuItem value="add-new">Add New</MenuItem>
              )}
              {allTags.map((t) => (
                <MenuItem key={t._id} value={t._id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" type="submit">
            {id ? "Update" : "Create"}
          </Button>
        </form>

        {/* Modals */}
        <AddNewModal
          open={showAddTag}
          title="Create Tag"
          fields={[
            { name: "name", label: "Name" },
            { name: "slug", label: "Slug" },
          ]}
          onSubmit={async (vals) => {
            const r = await api.post("/tags", vals);
            setAllTags((prev) => [r.data, ...prev]);
            setSelectedTags((prev) => [...prev, r.data._id]);
            setShowAddTag(false);
          }}
          onClose={() => setShowAddTag(false)}
        />

        <AddNewModal
          open={showAddDept}
          title="Create Department"
          fields={[{ name: "name", label: "Name" }]}
          onSubmit={async (vals) => {
            const r = await api.post("/departments", vals);
            setDepartments((prev) => [r.data, ...prev]);
            setDepartment(r.data._id);
            setShowAddDept(false);
          }}
          onClose={() => setShowAddDept(false)}
        />
      </Paper>
    </Box>
  );
}
