import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type SalaryStatus = "inasubiri" | "imelipwa";

export interface Salary {
  id: string;
  staff: string;
  staff_name: string;
  store: string;
  store_name: string;
  month: string;
  basic_salary: string;
  allowances: string;
  deductions: string;
  total_paid: string;
  status: SalaryStatus;
  paid_at: string | null;
}

// ==================================================================
// API
// ==================================================================
export const staffApi = {
  salaries: (params?: {
    staff?: string;
    store?: string;
    status?: SalaryStatus;
  }) =>
    api
      .get<Salary[]>("/staff/salaries/", { params })
      .then((r) => r.data),

  createSalary: (payload: {
    staff_id: string;
    store_id: string;
    month: string;
    basic_salary: number;
    allowances?: number;
    deductions?: number;
  }) => api.post<Salary>("/staff/salaries/", payload).then((r) => r.data),

  paySalary: (id: string) =>
    api.post<Salary>(`/staff/salaries/${id}/pay/`).then((r) => r.data),
};