// Lightweight stand-in for sweetalert2 so tests can assert on alerts
// without rendering real modals. Default behaviour is set in src/setupTests.ts.
const Swal = {
  fire: jest.fn()
};

export default Swal;
