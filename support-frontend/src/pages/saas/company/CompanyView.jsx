// src/pages/saas/company/CompanyView.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCompany } from "../../../store/slices/saas/companySlice";
import { useParams } from "react-router-dom";

export default function CompanyView() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selected } = useSelector((s) => s.company);

  useEffect(() => {
    dispatch(getCompany(id));
  }, [id]);

  if (!selected) return <p>Loading...</p>;

  return (
    <div>
      <h2>{selected.name}</h2>
      <p>Email: {selected.contact?.email}</p>
      <p>Status: {selected.status}</p>
      <p>Billing Type: {selected.billingType}</p>
    </div>
  );
}
