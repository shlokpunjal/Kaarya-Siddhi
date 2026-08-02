import { useState } from "react";
import { authFetch } from "../utils/authFetch";

export type EmployeeProfile = {
  id: string;
  name: string;
};

/**
 * Encapsulates the "type a name, pick from a filtered dropdown" pattern
 * used on the New/Edit Task form's Assign To field.
 */
export function useEmployeeAutocomplete() {
  const [employeesList, setEmployeesList] = useState<EmployeeProfile[]>([]);
  const [assignToName, setAssignToName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>(
    [],
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const loadEmployees = async () => {
    const res = await authFetch("/employees-directory");
    if (!res.ok) return [] as EmployeeProfile[];
    const data = await res.json();
    setEmployeesList(data);
    return data as EmployeeProfile[];
  };

  const search = (text: string) => {
    setAssignToName(text);
    setSelectedEmployeeId(null);
    if (text.trim() === "") {
      setFilteredEmployees([]);
      setShowDropdown(false);
      return;
    }
    setFilteredEmployees(
      employeesList.filter((emp) =>
        emp.name.toLowerCase().includes(text.toLowerCase()),
      ),
    );
    setShowDropdown(true);
  };

  const select = (emp: EmployeeProfile) => {
    setAssignToName(emp.name);
    setSelectedEmployeeId(emp.id);
    setShowDropdown(false);
  };

  // Used when hydrating the form in edit mode, once we know which
  // employee id the task is assigned to.
  const presetFromId = (id: string, employees: EmployeeProfile[]) => {
    setSelectedEmployeeId(id);
    const matched = employees.find((e) => e.id === id);
    setAssignToName(matched?.name ?? "");
  };

  return {
    employeesList,
    assignToName,
    selectedEmployeeId,
    filteredEmployees,
    showDropdown,
    loadEmployees,
    search,
    select,
    presetFromId,
  };
}