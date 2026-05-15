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
            font-family: 'Georgia', 'Times New Roman', serif;
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
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .header {
            background-color: #5b2d8e;
            padding: 28px 40px;
        }

        .header h1 {
            margin: 0;
            font-family: 'Georgia', serif;
            font-size: 20px;
            font-weight: normal;
            color: #ffffff;
            letter-spacing: 0.5px;
        }

        .header p {
            margin: 4px 0 0;
            font-size: 12px;
            color: rgba(255,255,255,0.75);
            letter-spacing: 1px;
            text-transform: uppercase;
            font-family: Arial, sans-serif;
        }

        .body {
            padding: 36px 40px;
        }

        .greeting {
            font-size: 16px;
            line-height: 1.7;
            margin: 0 0 24px;
            color: #2c2c2c;
        }

        .credential-box {
            background-color: #fafafa;
            border-left: 3px solid #5b2d8e;
            padding: 16px 20px;
            margin: 24px 0;
            border-radius: 0 4px 4px 0;
        }

        .credential-box p {
            margin: 0 0 6px;
            font-size: 14px;
            color: #555;
            font-family: Arial, sans-serif;
        }

        .credential-box p:last-child {
            margin-bottom: 0;
        }

        .credential-box strong {
            color: #2c2c2c;
            font-family: 'Courier New', monospace;
            font-size: 15px;
        }

        .credential-box .format-hint {
            font-size: 12px;
            color: #888;
            font-style: italic;
            margin-top: 4px;
        }

        .section {
            margin: 24px 0;
        }

        .section p {
            margin: 0 0 10px;
            font-size: 15px;
            line-height: 1.7;
            color: #2c2c2c;
            font-family: Arial, sans-serif;
        }

        .section p:last-child {
            margin-bottom: 0;
        }

        .link-block {
            display: block;
            margin: 8px 0;
            font-family: Arial, sans-serif;
            font-size: 14px;
        }

        .link-block a {
            color: #5b2d8e;
            text-decoration: none;
            border-bottom: 1px solid rgba(91,45,142,0.3);
            padding-bottom: 1px;
        }

        .note-box {
            background-color: #fff8f0;
            border: 1px solid #f0d9c0;
            border-radius: 4px;
            padding: 14px 18px;
            margin: 24px 0;
        }

        .note-box p {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: #7a5230;
            font-family: Arial, sans-serif;
        }

        .note-box .note-label {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.8px;
            display: block;
            margin-bottom: 4px;
            color: #b8722a;
        }

        .divider {
            border: none;
            border-top: 1px solid #ebebeb;
            margin: 28px 0;
        }

        .closing {
            font-size: 15px;
            line-height: 1.8;
            color: #2c2c2c;
            font-family: Arial, sans-serif;
        }

        .closing .signature {
            margin-top: 16px;
            font-weight: bold;
            font-size: 14px;
            color: #5b2d8e;
            letter-spacing: 0.5px;
        }

        .footer {
            background-color: #f9f9f9;
            border-top: 1px solid #ebebeb;
            padding: 18px 40px;
            text-align: center;
        }

        .footer p {
            margin: 0;
            font-size: 11px;
            color: #aaa;
            font-family: Arial, sans-serif;
            letter-spacing: 0.3px;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">

            {{-- Header --}}
            <div class="header">
                <h1>Arellano University School of Law</h1>
            </div>

            {{-- Body --}}
            <div class="body">

                <p class="greeting">
                    Good day, you are now <strong>officially enrolled</strong>.
                </p>

                <p style="font-size:15px; font-family: Arial, sans-serif; color:#2c2c2c; margin: 0 0 8px;">
                    Please use the following credentials to access your student account:
                </p>

                <div class="credential-box">
                    <p>Username: <strong>{{ $studentNumber }}</strong></p>
                    <p>Password: <strong>LASTNAME9999</strong></p>
                    <p class="format-hint">Format: Last name + birth month + birthday (e.g. DELA CRUZ0317)</p>
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
                        If you have already changed your password in the application, please use that same password.
                    </p>
                </div>

                <div class="section">
                    <p>Click the <strong>Schedule Tab</strong> to access your Zoom class links.</p>
                    <p>Register your device for School WiFi:</p>
                    <span class="link-block">
                        <a href="https://arellanolaw.edu/wifi/">https://arellanolaw.edu/wifi/</a>
                    </span>
                </div>

                <hr class="divider">

                <div class="closing">
                    <p>Thank you and stay safe.</p>
                    <p class="signature">ITC — Information Technology Center</p>
                </div>

            </div>

            {{-- Footer --}}
            <div class="footer">
                <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>

        </div>
    </div>
</body>
</html>