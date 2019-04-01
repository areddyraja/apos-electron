import { Component, OnInit, ChangeDetectorRef, NgZone, AfterViewInit, ViewChild, Type } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpRequest, HttpResponse, HttpEventType } from '@angular/common/http';
import { CdtaService } from '../../cdta.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-shift-sales-summary',
  templateUrl: './shift-sales-summary.component.html',
  styleUrls: ['./shift-sales-summary.component.css']
})
export class ShiftSalesSummaryComponent implements OnInit {
  sales = []
  selectedValue: any = 0
  selectedValues: any
  salesData: any
  salesPaymentData: any
  public totalSold: any = 0
  public backendPaymentReport = []
  public backendSalesReport = []
  constructor(private cdtaservice: CdtaService, private route: ActivatedRoute, private router: Router, private _ngZone: NgZone, private electronService: ElectronService, private ref: ChangeDetectorRef, private http: HttpClient) {

    this.electronService.ipcRenderer.on('allSalesResult', (event, data, userID, shiftType) => {
      console.log("sales data", data)
      if (data != undefined && data.length != 0) {
        this._ngZone.run(() => {
          if (this.selectedValue == 0) {
            this.salesData = JSON.parse(data);
            var salesReport: any = JSON.parse(data);
            for (var report = 0; report < salesReport.length; report++) {
              salesReport[report].userID = userID
              salesReport[report].shiftType = shiftType
              this.backendSalesReport.push(salesReport[report]);
            }
            this.salesData = cdtaservice.getUniqueSaletReport(this.backendSalesReport)
          } else {
            this.backendSalesReport = []
            this.salesData = JSON.parse(data)
          }
        });
      }
    });

    this.electronService.ipcRenderer.on('allPaymentsResult', (event, data, userID, shiftType) => {
      console.log("sales data", data)
      if (data != undefined && data.length != 0) {
        this._ngZone.run(() => {
          if (this.selectedValue == 0) {
            var paymentReport: any = JSON.parse(data);
            for (var report = 0; report < paymentReport.length; report++) {
              paymentReport[report].userID = userID
              paymentReport[report].shiftType = shiftType
              this.totalSold = this.totalSold + paymentReport[report].paymentAmount
              this.backendPaymentReport.push(paymentReport[report]);
            }
            localStorage.setItem("printPaymentData", JSON.stringify(this.backendPaymentReport))

            this.salesPaymentData = cdtaservice.iterateAndFindUniquePaymentTypeString(this.backendPaymentReport);
          } else {
            this.totalSold = 0
            this.backendPaymentReport = []
            JSON.parse(data).forEach(element => {
              this.totalSold = this.totalSold + element.paymentAmount
            });
            this.salesPaymentData = JSON.parse(data)
          }
        });
        return this.salesPaymentData
      }
    });

    this.electronService.ipcRenderer.on('printSummaryReportResult', (event, data) => {
      console.log("sales data", data)
      if (data != undefined && data != "") {
        this._ngZone.run(() => {
        });
      }
    });

    this.electronService.ipcRenderer.on('printReceiptHeaderResult', (event, data) => {
      if (data != undefined && data != "") {
        this._ngZone.run(() => {
        });
      }
    });

    this.electronService.ipcRenderer.on('printSummaryPaymentsReportResult', (event, data) => {
      if (data != undefined && data != "") {
        this.salesPaymentData = JSON.parse(data);
        this._ngZone.run(() => {
        });
      }
    });

  }


  ngOnInit() {
    this.sales = JSON.parse(localStorage.getItem("shiftReport"));
    this.selectedValue = 0
    console.log("this.selectedValue", this.selectedValue)
    let shiftStore = JSON.parse(localStorage.getItem("shiftReport"));
    shiftStore.forEach(element => {
      this.electronService.ipcRenderer.send('allSales', Number(element.shiftType), element.initialOpeningTime, element.timeClosed, Number(element.userID))
      this.electronService.ipcRenderer.send('allPayments', Number(element.userID), Number(element.shiftType), element.initialOpeningTime, element.timeClosed, null, null, null)
    });

  }

  hidePopUp() {
    let shiftReports = JSON.parse(localStorage.getItem("shiftReport"));
    let userId = localStorage.getItem("userID")
    if (localStorage.getItem("closingPausedMainShift") == "true") {
      localStorage.setItem("closingPausedMainShift", "false")
    }
    shiftReports.forEach(element => {
      if ((element.shiftType == "0" && element.shiftState == "0") || (element.shiftType == "1" && element.shiftState == "0")) {
        localStorage.setItem("hideModalPopup", "true")
      } else if (element.shiftState == 3 && element.userID == localStorage.getItem("userID")) {
        localStorage.setItem("hideModalPopup", "false")
      }
    })

    this.electronService.ipcRenderer.removeAllListeners("allSalesResult");
    this.electronService.ipcRenderer.removeAllListeners("allPaymentsResult")
  }

  shiftSaleSummary() {
    if (this.selectedValues == 0) {
      this.selectedValue = 0
      console.log("this.selectedValue", this.selectedValue)
      let shiftStore = JSON.parse(localStorage.getItem("shiftReport"));
      this.totalSold = 0
      this.backendPaymentReport = []
      this.backendSalesReport = []
      shiftStore.forEach(element => {
        this.electronService.ipcRenderer.send('allSales', Number(element.shiftType), element.initialOpeningTime, element.timeClosed, Number(element.userID))
        this.electronService.ipcRenderer.send('allPayments', Number(element.userID), Number(element.shiftType), element.initialOpeningTime, element.timeClosed, null, null, null)
      });
    } else {
      this.selectedValue = this.selectedValues
      console.log("this.selectedvalue", this.selectedValue)
      this.electronService.ipcRenderer.send('allSales', Number(this.selectedValues.shiftType), this.selectedValues.initialOpeningTime, this.selectedValues.timeClosed, Number(this.selectedValues.userID))
      this.electronService.ipcRenderer.send('allPayments', Number(this.selectedValues.userID), Number(this.selectedValues.shiftType), this.selectedValues.initialOpeningTime, this.selectedValues.timeClosed, null, null, null)
    }
  }

  printSummaryReceipt() {
    var specificUser = []
    if (this.selectedValue == 0) {
      this.cdtaservice.printAllOrSpecificShiftData(null)
    } else {
      specificUser.push(this.selectedValue)
      this.cdtaservice.printAllOrSpecificShiftData(specificUser)
    }
  }



}
