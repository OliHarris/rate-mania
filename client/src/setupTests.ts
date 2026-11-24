import "@testing-library/jest-dom";
import Swal from "sweetalert2/src/sweetalert2.js";

beforeEach(() => {
  // Restore the default resolved alert after mocks are reset between tests.
  (Swal.fire as jest.Mock).mockImplementation(() =>
    Promise.resolve({ isConfirmed: true })
  );
});
