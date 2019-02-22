import { Component, NgZone, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { CdtaService } from '../../cdta.service';
import { ElectronService } from 'ngx-electron';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    loading = false;
    submitted = false;
    returnUrl: string;
    username: string;
    password: string;
    userdata: any
    errorMsg: Boolean = false;
    carddata: any
    shiftType: any
    shiftState: any
    statusOfShiftReport: string = ""
    shiftReport: any = [
        {
            userID: "",
            shiftID: "0",
            shiftType: "",
            shiftState: "3",
            openingDrawer: "0.00",
            closingDrawer: "0.00",
            initialOpeningTime: 0,
            timeOpened: 0,
            timeClosed: 0,
            userThatClosedShift: ""
        }
    ]


    // usersData = {
    //     "users": [
    //         {
    //             "username": "admin@cdta.com",
    //             "password": "123456aA"
    //         },
    //         {
    //             "username": "superadmin@cdta.com",
    //             "password": "123456aA"
    //         }


    //     ]
    // }

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private cdtaservice: CdtaService, private _ngZone: NgZone, private electronService: ElectronService
    ) {

        this.electronService.ipcRenderer.on('loginCallResult', (event, data) => {
            if (data != undefined && data != "") {
                this.userdata = JSON.parse(data)
                localStorage.setItem("userID", this.userdata.personId)
                localStorage.setItem("userEmail", this.userdata.username)
                // let previousOpenShif = localStorage.getItem("openShift")
                let shiftStore = JSON.parse(localStorage.getItem("shiftReport"))

                shiftStore = shiftStore.filter(element => element.userID != this.userdata.personId)

                shiftStore.forEach(element => {
                    console.log(element);
                    if (element.shiftState == "3" || element.userID == "") {
                        element.userID = this.userdata.personId
                        element.userEmail = this.userdata.username;
                        element.shiftType = "0"
                    } else if (element.userID != this.userdata.personId && element.userID != "") {

                        if (shiftStore.indexOf(this.userdata.personId) === -1) {
                            let newShiftReport = {
                                userEmail: this.userdata.username,
                                userID: this.userdata.personId,
                                shiftID: "0",
                                shiftType: "1",
                                shiftState: "3",
                                openingDrawer: "0.00",
                                closingDrawer: "0.00",
                                initialOpeningTime: 0,
                                timeOpened: 0,
                                timeClosed: 0,
                                userThatClosedShift: ""
                            }
                            shiftStore.push(newShiftReport)

                        }
                    }
                    else if (element.shiftState == "4" && element.userID == this.userdata.personId && element.shiftType == "0") {

                    }

                    localStorage.setItem("shiftReport", JSON.stringify(shiftStore))
                });

                // if (previousOpenShif == "false") {
                //     localStorage.removeItem("openShift")
                // }


                this._ngZone.run(() => {
                    // this.carddata = new Array(JSON.parse(data));
                    // console.log('this.carddata', this.carddata);
                    this.router.navigate(['/readcard'])
                });
            }
        });
    }

    ngOnInit() {
        this.loginForm = this.formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required]
        });
        localStorage.removeItem("mainShiftClosed")
        localStorage.removeItem("mainShiftClose")
        if (localStorage.getItem("shiftReport") != undefined) {
            let shiftReports = JSON.parse(localStorage.getItem("shiftReport"));
            let userId = localStorage.getItem("userID")
            shiftReports.forEach(element => {
                if (element.shiftState == "3"  && element.shiftType == "0" && localStorage.getItem("mainShiftClose")) {
                    this.statusOfShiftReport = "Main Shift is Closed"
                } else
                    if (element.shiftState == "3"  && element.shiftType == "0") {
                        this.statusOfShiftReport = "Main Shift is Closed"
                    }
                    else if (element.shiftState == "4"  && element.shiftType == "0") {
                        this.statusOfShiftReport = "Main Shift is Paused"
                    }
            })
        }
        else {
            localStorage.setItem("shiftReport", JSON.stringify(this.shiftReport))
        }





    }

    // convenience getter for easy access to form fields
    get f() { return this.loginForm.controls; }

    onSubmit() {
        this.submitted = true;

        // stop here if form is invalid
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.cdtaservice.login(this.f.username.value, this.f.password.value)
            .subscribe((data: any) => {
                this.router.navigate(['/readcard']);
            },
                error => {
                    // this.alertService.error(error);
                    this.loading = false;
                });
    }


    jsonValues() {
        this.cdtaservice.jsonData()
            .subscribe((data: any) => {
                this.router.navigate(['/readcard']);

                console.log('json data', data)
                var base64 = btoa(data.aws.credentials.accessKey + "|" + data.aws.credentials.secretKey + '|' + data.aws.credentials.sessionId)
                console.log('base64', base64);

            },
                error => {
                    // this.alertService.error(error);
                    // this.loading = false;
                });
    }

    Login() {
        // for (var a = 0; a < this.usersData.users.length; a++) {
        //     if (this.username == this.usersData.users[a].username && this.password == this.usersData.users[a].password) {
        //         this.router.navigate(['/readcard']);
        //     }else{
        //         this.errorMsg = true
        //     }
        // }
        var user = {
            username: this.username,
            password: this.password
        }
        this.electronService.ipcRenderer.send('logincall', user)


    }
}

