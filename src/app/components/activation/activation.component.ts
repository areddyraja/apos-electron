import { Component, OnInit, ChangeDetectorRef, NgZone, AfterViewInit, ViewChild, Type } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpRequest, HttpResponse, HttpEventType } from '@angular/common/http';
import { CdtaService } from '../../cdta.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-activation',
  templateUrl: './activation.component.html',
  styleUrls: ['./activation.component.css']
})
export class ActivationComponent implements OnInit {
  carddata : any
  title = 'Activation-Call Support at the Transit For SetUp Code';
  workType: string;
  form: any;
  password:any
  organization : string
  constructor(private cdtaservice: CdtaService, private router: Router, private _ngZone: NgZone, private electronService: ElectronService, private ref: ChangeDetectorRef, private http: HttpClient) {

  //   this.electronService.ipcRenderer.on('activationCallResult', (event, data) => {
  //     if (data != undefined && data != "") {
  //         this._ngZone.run(() => {
  //             this.carddata = new Array(JSON.parse(data));
  //             console.log('this.carddata', this.carddata);
             
  //         });
  //     }
  // });
  this.electronService.ipcRenderer.on('verifyCallResult', (event, data) => {
    if (data != undefined && data != "") {
      this._ngZone.run(() => {
        this.carddata = new Array(JSON.parse(data));
        this.password =  this.carddata[0].deviceSetup.password;
        this.organization = this.carddata[0].deviceSetup.organizationName
        localStorage.setItem("organization",this.organization)
        localStorage.setItem("pass", this.password);
        console.log('this.carddata', this.carddata);
         this.router.navigate(['/verify'])
      });
    }
  });
   }

//   activationCall(form:any) {
//     if (this.save(form)) {
//       console.log("form", form.value)
//       var data = {
//         assetId: form.value.hardware,
//         setupCode: form.value.setupid,
//       }
//     this.electronService.ipcRenderer.send('activationcall', data)
//     console.log('read call', event)
//     }
// }

      activationCall(form:any){
        if (this.save(form)) {
                console.log("form", form.value)
                var data = {
                  assetId: form.value.hardware,
                  setupCode: form.value.setupid,
                }
                localStorage.setItem("assetId", form.value.hardware);
              this.electronService.ipcRenderer.send('verifycall', data, "uat")
              console.log('read call', event)
              }
      }

save(form: any): boolean {
  if (!form.valid) {
      return false;
  }
  
 // this.formDataService.setWork(this.workType);
  return true;
}

goToPrevious(form: any) {

      // Navigate to the personal page
      this.router.navigate(['/setup']);
  
}

// goToNext(form: any) {
//   if (this.save(form)) {
//       // Navigate to the address page
//       this.router.navigate(['/verify']);
//   }
// }

  ngOnInit() {


  }

}
