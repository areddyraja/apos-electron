import { Component, NgZone, OnInit } from '@angular/core';
import { CdtaService } from 'src/app/cdta.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ElectronService } from 'ngx-electron';

declare var $: any

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.css']
})
export class ShiftsComponent implements OnInit {

  numberDigits: any = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  zeroDigits: any = ["0", "00"]
  productTotal: any = 0;
  openShift: Boolean = true
  hideModalPopup: Boolean = false;
  setShiftStatus: any
  setShiftText: any
  expectedCash: any = 0
  // mainShiftClosed: Boolean = false

  constructor(private formBuilder: FormBuilder, private cdtaService: CdtaService, private router: Router, private _ngZone: NgZone, private electronService: ElectronService) { }

  cashDrawer() {
    //this.openShift = false
    //localStorage.setItem("openShift", this.openShift.toString());
    let shiftStore = JSON.parse(localStorage.getItem("shiftReport"))
    shiftStore.forEach(element => {
      if (element.userID == localStorage.getItem("userID") && element.shiftState == "3") {
        element.initialOpeningTime = new Date().getTime();
        element.shiftState = "0";
        element.openingDrawer = this.productTotal
        element.timeOpened = new Date().getTime();
        localStorage.setItem("disableUntilReOpenShift", "false")
      }
      localStorage.setItem("shiftReport", JSON.stringify(shiftStore))
    });
    this.router.navigate(["/admin"])
    this.hideModalPopup = false
    localStorage.setItem("hideModalPopup", this.hideModalPopup.toString())

  }
  mainShiftClose() {
    //this.mainShiftClosed = true
    let shiftStore = JSON.parse(localStorage.getItem("shiftReport"))
    let shiftreportUser = localStorage.getItem("userID")
    let mainShiftClose = "true"
    if (localStorage.getItem("closingPausedMainShift") == "true") {
    shiftStore.filter(element => {
    if (element.shiftState == "4") {
    element.shiftState = "3"
    element.userThatClosedShift = localStorage.getItem("userEmail")
    element.timeClosed = new Date().getTime();
    element.closingDrawer = this.productTotal
    localStorage.setItem("mainShiftClose", mainShiftClose)
    // this.printSummaryReport();
    }
    
    if (element.userID == shiftreportUser && element.shiftType == "1") {
    element.shiftState = "3";
    element.timeClosed = new Date().getTime();
    element.closingDrawer = this.productTotal
    element.userThatClosedShift = localStorage.getItem("userEmail")
    }
    
    })
    }
    shiftStore.forEach(element => {
    if (element.userID == shiftreportUser && element.shiftType == "0") {
    element.shiftState = "3";
    element.timeClosed = new Date().getTime();
    element.closingDrawer = this.productTotal
    element.userThatClosedShift = localStorage.getItem("userEmail")
    localStorage.setItem("mainShiftClose", mainShiftClose)
    // this.printSummaryReport();
    
    } else
    if (element.userID == shiftreportUser && element.shiftType == "1") {
    element.shiftState = "3";
    element.timeClosed = new Date().getTime();
    element.closingDrawer = this.productTotal
    }
    })
    localStorage.setItem("shiftReport", JSON.stringify(shiftStore))
    //this.printSummaryReport();
    localStorage.setItem("disableUntilReOpenShift", "true")
    this.router.navigate(["/admin"])
    }
  validShifts() {

    let reliefShif = JSON.parse(localStorage.getItem("shiftReport"));
    let userId = localStorage.getItem("userID")

    reliefShif.forEach(element => {
      if (element.shiftState == "3" && element.userID == userId && element.shiftType == "1" && localStorage.getItem("closingPausedMainShift")) {
        $("#closeShiftModal").modal('show');
      } else
        if (element.shiftState == "3" && element.userID == userId && (element.shiftType == "0" || element.shiftType == "1")) {
          $("#openShiftModal").modal('show');
        } else if (element.shiftState == "0" && element.userID == userId && (element.shiftType == "0" || element.shiftType == "1")) {
          $("#closeShiftModal").modal('show');
        } else if (element.shiftState == "4" && element.userID == userId && element.shiftType == "0") {

        }
    });

  }

  displayDigit(digit) {
    console.log("numberDigits", digit);
    this.productTotal = Math.round(this.productTotal * 100);
    this.productTotal += digit;
    this.productTotal = this.productTotal / 100;
    // if (this.productTotal == 0) {
    //   this.productTotal = digit;
    //   // this.productTotal+=digit
    // } else
    //   this.productTotal += digit

  }
  clearDigit(digit) {
    console.log("numberDigits", digit);
    this.productTotal = digit
  }

  hidePopUp() {
    this.hideModalPopup = true
    localStorage.setItem("hideModalPopup",this.hideModalPopup.toString())
    if(localStorage.getItem("closingPausedMainShift") == "true"){
      localStorage.setItem("closingPausedMainShift", "false")
    }
    let shiftReports = JSON.parse(localStorage.getItem("shiftReport"));
    let userId = localStorage.getItem("userID")
    shiftReports.forEach(element => {
      if ((element.shiftType == "0" && element.shiftState == "0") || (element.shiftType == "1" && element.shiftState == "0")) {
        localStorage.setItem("hideModalPopup", "true")
      } else if (element.shiftState == 3 && element.userID == localStorage.getItem("userID")){
        localStorage.setItem("hideModalPopup", "false")
      }
    })
  }
  ngOnInit() {
    let shiftReports = JSON.parse(localStorage.getItem("shiftReport"));
    let userId = localStorage.getItem("userID")
    shiftReports.forEach(element => {
      if(localStorage.getItem("closingPausedMainShift") == "true" && element.userID == userId){
        this.setShiftStatus = "CLOSE SHIFT"
        this.expectedCash = element.openingDrawer
        this.setShiftText = "Enter the total closing amount in the till and Tap 'Enter' "
      }
      else
      if ((element.shiftType == "0" && element.shiftState == "3") && element.userID == userId) {
        this.setShiftStatus = "OPEN SHIFT"
        this.expectedCash = 0
        this.setShiftText = "Enter the total opening amount in the till and Tap 'Enter' "
      } else if ((element.shiftType == "0" && element.shiftState == "0") && element.userID == userId) {
        this.setShiftStatus = "CLOSE SHIFT"
        this.expectedCash =  element.openingDrawer
        this.setShiftText = "Enter the total closing amount in the till and Tap 'Enter' "
      } else if ((element.shiftType == "1" && element.shiftState == "3") && element.userID == userId) {
        this.setShiftStatus = "RELIEF SHIFT"
        this.expectedCash = 0
        this.setShiftText = "Enter the total opening amount in the till and Tap 'Enter' "
      } else if ((element.shiftType == "1" && element.shiftState == "0") && element.userID == userId) {
        this.setShiftStatus = "CLOSE RELIEF SHIFT"
        this.expectedCash =  element.openingDrawer
        this.setShiftText = "Enter the total closing amount in the till and Tap 'Enter' "
      }
    })

  }

}
