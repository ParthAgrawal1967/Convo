import React from 'react'
import "../App.css"
import { Link } from "react-router-dom";
export default function LandingPage() {
  return (
    <div className="landingPageContainer">
        <nav>
     <div className="navHeader">
        <h2>
            Convo
        </h2>
     </div>
     <div className="navlist">
        <p>Join as Guest</p>
        <p>Register</p>
        <div role='button'>
            <p>Login</p>
        </div>
     </div>
     </nav>
      <div className="landingMainContainer">
        <div>
            <h1>
                Experience seamless conversations that bring your loved ones and teams closer than ever before.
            </h1>
            <p>Closer Than Ever — Through Every Call.</p>
            <div>
                <Link to={"/auth"}>Get Started</Link>
            </div>
        </div>
        <div>
            <img src="/mobile10.png" alt="mobile"/>
        </div>
    </div>
    </div>
  )
}
