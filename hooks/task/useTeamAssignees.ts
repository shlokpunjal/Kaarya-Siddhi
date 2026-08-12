import { useState } from "react";
import type { EmployeeProfile } from "./useEmployeeAutocomplete";

export type { EmployeeProfile };

/**
 * Multi-select variant of useEmployeeAutocomplete — same "type a name,
 * pick from a filtered dropdown" pattern, but builds up a list of several
 * selected employees (with add/remove) instead of a single one. Reuses
 * the employee directory already loaded by useEmployeeAutocomplete rather
 * than fetching it again.
 */
export function useTeamAssignees(employeesList: EmployeeProfile[]) {
  const [searchText, setSearchText] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<
    EmployeeProfile[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<EmployeeProfile[]>([]);

  const search = (text: string) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredEmployees([]);
      setShowDropdown(false);
      return;
    }
    const selectedIds = new Set(selected.map((e) => e.id));
    setFilteredEmployees(
      employeesList.filter(
        (emp) =>
          !selectedIds.has(emp.id) &&
          emp.name.toLowerCase().includes(text.toLowerCase()),
      ),
    );
    setShowDropdown(true);
  };

  const add = (emp: EmployeeProfile) => {
    setSelected((prev) =>
      prev.some((e) => e.id === emp.id) ? prev : [...prev, emp],
    );
    setSearchText("");
    setFilteredEmployees([]);
    setShowDropdown(false);
  };

  const remove = (id: string) => {
    setSelected((prev) => prev.filter((e) => e.id !== id));
  };

  const reset = () => {
    setSelected([]);
    setSearchText("");
    setFilteredEmployees([]);
    setShowDropdown(false);
  };

  return {
    searchText,
    filteredEmployees,
    showDropdown,
    selected,
    search,
    add,
    remove,
    reset,
  };
}