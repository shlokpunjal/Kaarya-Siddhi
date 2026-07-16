import { useLoading as useLoadingContext } from "../context/LoadingContext";

export default function useLoading() {
  return useLoadingContext();
}