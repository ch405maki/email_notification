<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Onboarding</title>

    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: Arial, sans-serif;
            color: #2c2c2c;
        }

        .wrapper {
            width: 100%;
            background-color: #f4f6f8;
            padding: 40px 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        /* BANNER */
        .banner img {
            width: 100%;
            height: auto;
            display: block;
        }

        /* BODY */
        .body {
            padding: 38px 40px;
        }

        .greeting {
            font-size: 16px;
            line-height: 1.8;
            margin: 0 0 24px;
        }

        .credential-box {
            background-color: #fafafa;
            border-left: 4px solid #5b2d8e;
            padding: 18px 20px;
            margin: 24px 0;
        }

        .credential-box p {
            margin: 0 0 8px;
            font-size: 14px;
            color: #555;
        }

        .credential-box strong {
            color: #2c2c2c;
        }

        .format-hint {
            font-size: 12px;
            color: #888;
            font-style: italic;
        }

        .section {
            margin: 24px 0;
        }

        .section p {
            margin: 0 0 10px;
            font-size: 15px;
            line-height: 1.7;
        }

        .link-block {
            display: block;
            margin-top: 8px;
            word-break: break-word;
        }

        .link-block a {
            color: #5b2d8e;
            text-decoration: none;
        }

        .note-box {
            background-color: #fff8f0;
            border: 1px solid #f0d9c0;
            border-radius: 4px;
            padding: 14px 18px;
            margin: 24px 0;
        }

        .note-label {
            display: block;
            margin-bottom: 6px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #b8722a;
        }

        .note-box p {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: #7a5230;
        }

        .divider {
            border: none;
            border-top: 1px solid #ebebeb;
            margin: 30px 0;
        }

        .closing p {
            margin: 0 0 8px;
            font-size: 15px;
            line-height: 1.8;
        }

        .signature {
            margin-top: 16px;
            font-weight: bold;
            font-size: 14px;
            color: #5b2d8e;
            letter-spacing: 0.5px;
        }

        /* FOOTER IMAGE */
        .footer {
            background-color: #f9f9f9;
            border-top: 1px solid #ebebeb;
            text-align: center;
            padding: 18px 10px;
        }

        .footer img {
            max-width: 220px;
            width: 100%;
            height: auto;
            display: inline-block;
        }

        /* MOBILE */
        @media only screen and (max-width: 600px) {

            .body {
                padding: 30px 24px;
            }

            .footer img {
                max-width: 180px;
            }
        }
    </style>
</head>

<body>

<div class="wrapper">

    <div class="container">

        <!-- BANNER -->
        <div class="banner">
            <img src="https://arellanolaw.edu/images/banner.jpg" alt="Arellano University School of Law Banner">
        </div>

        <!-- BODY -->
        <div class="body">

            <p class="greeting">
                Good day!
              <br/>
              You are now <strong>OFFICIALLY ENROLLED</strong>.
            </p>

            <p style="font-size:15px; margin:0 0 10px;">
                Please use the following credentials to access your student account:
            </p>

            <div class="credential-box">
                <p>Username: <strong>{{ $studentNumber }}</strong></p>
                <p>Password: <strong>LASTNAME9999</strong></p>
                <p class="format-hint">Ex:  <strong>DELACRUZ0101</strong><br />Format: Last name + birth month + birthday</p>
            </div>

            <div class="section">
                <p>Log in to your student portal:</p>
                <span class="link-block">
                    <a href="https://aims.arellanolaw.edu/aims/students/">
                        https://aims.arellanolaw.edu/aims/students/
                    </a>
                </span>
            </div>

            <div class="note-box">
                <span class="note-label">Note</span>
                <p>
                    Change your password upon login.
                    If you already changed your password in the application,
                    please use that same password.
                </p>
            </div>

            <div class="section">
                <p>
                    Click the <strong>Schedule Tab</strong> to access your Zoom class links.
                </p>

                <p>
                    Register your device for School WiFi:
                </p>

                <span class="link-block">
                    <a href="https://arellanolaw.edu/wifi/">
                        https://arellanolaw.edu/wifi/
                    </a>
                </span>
            </div>

            <hr class="divider">

            <div class="closing">
                <p>Thank you and stay safe.</p>
                <div class="signature">
                    <img 
                        src="https://ci3.googleusercontent.com/mail-sig/AIorK4wFhEsPJY9fyjriPVcdqjlGr55bpBjIm9QHo-5dani60uJ2vOGTV7ugMupge9IpExCkoZEKv3XnirSO"
                        alt="ITC — Information Technology Center"
                        style="max-width:280px; height:auto; display:block; text-align:left;"
                    >
                </div>
            </div>

        </div>
    </div>

</div>

</body>
</html>
