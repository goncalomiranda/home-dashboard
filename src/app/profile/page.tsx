import Layout from '@/components/Layout';

export default function Profile() {
  return (
    <Layout title="Profile">
      <div className="row">
        <div className="col-12">
          <div className="card card-plain h-100">
            <div className="card-header pb-0 p-3">
              <div className="row">
                <div className="col-md-8 d-flex align-items-center">
                  <h6 className="mb-3">Profile Information</h6>
                </div>
              </div>
            </div>
            <div className="card-body p-3">
              <p className="text-sm">
                Hi, I'm Alec Thompson, Decisions: If you can't decide, the answer is no. If two equally difficult paths, choose the one more painful in the short term (pain avoidance is creating an illusion of equality).
              </p>
              <hr className="horizontal gray-light my-4" />
              <ul className="list-group">
                <li className="list-group-item border-0 ps-0 pt-0 text-sm"><strong className="text-dark">Full Name:</strong> &nbsp; Alec M. Thompson</li>
                <li className="list-group-item border-0 ps-0 text-sm"><strong className="text-dark">Mobile:</strong> &nbsp; (44) 123 1234 123</li>
                <li className="list-group-item border-0 ps-0 text-sm"><strong className="text-dark">Email:</strong> &nbsp; alecthompson@mail.com</li>
                <li className="list-group-item border-0 ps-0 text-sm"><strong className="text-dark">Location:</strong> &nbsp; USA</li>
                <li className="list-group-item border-0 ps-0 pb-0">
                  <strong className="text-dark text-sm">Social:</strong> &nbsp;
                  <a className="btn btn-facebook btn-simple mb-0 ps-1 pe-2 py-0" href="#">
                    <i className="fab fa-facebook fa-lg"></i>
                  </a>
                  <a className="btn btn-twitter btn-simple mb-0 ps-1 pe-2 py-0" href="#">
                    <i className="fab fa-twitter fa-lg"></i>
                  </a>
                  <a className="btn btn-instagram btn-simple mb-0 ps-1 pe-2 py-0" href="#">
                    <i className="fab fa-instagram fa-lg"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}