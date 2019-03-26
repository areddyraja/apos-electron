import { Component, OnInit, Input, OnChanges, SimpleChange, SimpleChanges, NgZone } from '@angular/core';
import { CdtaService } from 'src/app/cdta.service';
import { ElectronService } from 'ngx-electron';
import { Router, ActivatedRoute } from '@angular/router';
import { SSL_OP_NO_TICKET } from 'constants';
import { encode } from 'punycode';
import { MediaType } from 'src/app/services/MediaType';
import { TransactionService } from 'src/app/services/Transaction.service';
import { debug } from 'util';
// import { product_log } from '../../../assets/data/product_catalog'
declare var pcsc: any;
declare var $: any;
var pcs = pcsc();
var cardName: any = 0;
var isExistingCard = false;
pcs.on('reader', function (reader) {
  console.log('reader', reader);
  console.log('New reader detected', reader.name);

  reader.on('error', function (err) {
    console.log('Error(', this.name, '):', err.message);
  });

  reader.on('status', function (status) {
    console.log('Status(', this.name, '):', status);
    /* check what has changed */
    const changes = this.state ^ status.state;
    if (changes) {
      if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
        console.log("card removed");/* card removed */
        reader.disconnect(reader.SCARD_LEAVE_CARD, function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log('Disconnected');
          }
        });
      } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
        cardName = reader.name
        console.log("sample", cardName)
        console.log("card inserted");/* card inserted */
        reader.connect({ share_mode: this.SCARD_SHARE_SHARED }, function (err, protocol) {
          if (err) {
            console.log(err);
          } else {
            console.log('Protocol(', reader.name, '):', protocol);
            reader.transmit(new Buffer([0x00, 0xB0, 0x00, 0x00, 0x20]), 40, protocol, function (err, data) {
              if (err) {
                console.log(err);
              } else {
                console.log('Data received', data);
                console.log('Data base64', data.toString('base64'));
                // reader.close();
                // pcs.close();
              }
            });
          }
        });
      }
    }
  });

  reader.on('end', function () {
    console.log('Reader', this.name, 'removed');
  });
});

pcs.on('error', function (err) {
  console.log('PCSC error', err.message);
});
@Component({
  selector: 'app-carddata',
  templateUrl: './carddata.component.html',
  styleUrls: ['./carddata.component.css']
})
export class CarddataComponent implements OnInit, OnChanges {

  @Input() public Carddata;
  // merchantise = [];
  // merchantList: any = [];
  // areExistingProducts: any = [];
  // encodeParseData: any = [];
  encodeJsonData: any = [];
  // readCarddata: any = {};
  cardJson: any = [];
  // productCardList: any = [];
  // encodedProductCardData: any = [];
  currentCard: any = [];
  currentCardProductList: any = [];
  // currentExistingProducts: any = [];
  cardIndex: any = 0;
  // carddata: any = [];
  // transactionId: any = "";
  // transactionAmount: any = 0;
  isNew: any = false;
  catalogJson: any = [];
  terminalConfigJson: any = [];
  // JsonObjCardObj: any = [];
  isFromCardComponent = false;
  isCorrectCardPlaced = false;
  isFromEncode = false;
  // executeIpcRendererOn: any = true;
  // encodeddata: any = [];
  shoppingCart: any = [];
  constructor(private cdtaService: CdtaService, private route: ActivatedRoute, private router: Router, private _ngZone: NgZone, private electronService: ElectronService) {
    route.params.subscribe(val => {
      this.cardIndex = 0;
      this.terminalConfigJson = JSON.parse(localStorage.getItem('terminalConfigJson'));
      // this.transactionAmount = JSON.parse(localStorage.getItem('transactionAmount'));
      // this.merchantList = localStorage.getItem('encodeData');
      // this.productCardList = localStorage.getItem('productCardData');
      // this.encodeParseData = JSON.parse(this.merchantList);
      // this.areExistingProducts = JSON.parse(localStorage.getItem('areExistingProducts'))
      // this.encodedProductCardData = JSON.parse(this.productCardList);
      this.cardJson = JSON.parse(localStorage.getItem("cardsData"));
      let item = JSON.parse(localStorage.getItem("catalogJSON"));
      this.catalogJson = JSON.parse(item).Offering;
      this.shoppingCart = JSON.parse(localStorage.getItem('shoppingCart'));
      this.currentCard = this.cardJson[this.cardIndex];
      if (this.isSmartCardFound()) {
        this.getSmartCardWalletContents();
      }
    });

    var updateCardDataListener: any = this.electronService.ipcRenderer.on('updateCardDataResult', (event, data) => {
      if (data != undefined && data != "" && this.isFromCardComponent) {
        this.electronService.ipcRenderer.send('readSmartcard', cardName)
      }
    });
    var readcardListener: any = this.electronService.ipcRenderer.on('readcardResult', (event, data) => {
      console.log("data", data)
      if (data != undefined && data != "" && this.isFromCardComponent) {
        this.isFromCardComponent = false;
        this._ngZone.run(() => {
          localStorage.setItem("readCardData", JSON.stringify(data));
          localStorage.setItem("printCardData", data)
          // this.electronService.ipcRenderer.send('generateSequenceNumber');
        });
      }
      // this.electronService.ipcRenderer.removeAllListeners("readCardResult");
    });
    var cardPIDListener: any = this.electronService.ipcRenderer.on('getCardPIDResult', (event, data) => {
      console.log("data", data)
      if (data != undefined && data != "" && this.isFromEncode) {
        this.isFromEncode = false;
        this._ngZone.run(() => {
          if (data == this.currentCard.printed_id) {
            this.encodeCard();
          }
          else {
            $("#cardModal").modal('show');
            return;
          }


        });
      }
      // this.electronService.ipcRenderer.removeAllListeners("getCardPIDResult");
    });
    this.electronService.ipcRenderer.on('printReceiptResult', (event, data) => {
      if (data != undefined && data != "") {
        // localStorage.setItem("deviceConfigData", data);
        alert("print success ");
        this._ngZone.run(() => {
          // this.router.navigate(['/addproduct'])
        });
      }
    });

    // var sequenceNumberListener: any = this.electronService.ipcRenderer.on('generateSequenceNumberSyncResult', (event, data) => {
    //   try {
    //     console.log("data", data)
    //     if (data != undefined && data != "") {
    //       this._ngZone.run(() => {
    //         this.transactionId = data;
    //         var cardsjson: any = [];
    //         var unitPrice: any = 0;
    //         var fareCode: any = "";
    //         var walletObj: any = [];
    //         var shiftType: any = 0;
    //         // var de
    //         // get unit price for ticket
    //         this.catalogJson.forEach(catalogElement => {
    //           if ((null == catalogElement.Ticket) &&
    //             (false == catalogElement.IsMerchandise) &&
    //             (null != catalogElement.WalletType)) {
    //             if (catalogElement.WalletType.WalletTypeId == 3) {
    //               unitPrice = catalogElement.UnitPrice;
    //             }
    //           }
    //         });
    //         // get farecode from terminal config
    //         this.terminalConfigJson.Farecodes.forEach(terminalConfigElement => {
    //           if (this.currentCard.user_profile == terminalConfigElement.FareCodeId) {
    //             fareCode = terminalConfigElement.Description;
    //           }
    //         });

    //         // get shiftType from ShiftReport
    //         var shiftReports = JSON.parse(localStorage.getItem("shiftReport"));
    //         var userId = localStorage.getItem("userID")
    //         shiftReports.forEach(shiftReportElement => {
    //           if (shiftReportElement.userID == userId) {
    //             shiftType = shiftReportElement.shiftType;
    //           }
    //         })
    //         var slotNumberStatusIndex: any = 0;
    //         this.cardJson.forEach(element => {
    //           this.currentCardProductList.forEach(walletElement => {
    //             var rechargesPending = 0;
    //             var balance = 0;
    //             var existingBalance = 0;
    //             var slotNumber = 0;
    //             if (this.carddata[0].products != undefined) {
    //               this.carddata[0].products.forEach(cardElement => {
    //                 if (walletElement.Ticket.Group == 1 && cardElement.product_type == 1 && (walletElement.Ticket.Designator == cardElement.designator)) {
    //                   rechargesPending = cardElement.recharges_pending;
    //                 } else if (walletElement.Ticket.Group == 2 && cardElement.product_type == 2 && (walletElement.Ticket.Designator == cardElement.designator)) {
    //                   existingBalance = cardElement.remaining_rides;
    //                 } else if (walletElement.Ticket.Group == 3 && cardElement.product_type == 3 && (walletElement.Ticket.Designator == cardElement.designator)) {
    //                   existingBalance = cardElement.remaining_value / 100;
    //                 }
    //               });
    //               if (walletElement.Ticket.Group == 1) {
    //                 balance = walletElement.Ticket.Value;
    //               } else if (walletElement.Ticket.Group == 2) {
    //                 balance = existingBalance;//+ (walletElement.quantity * walletElement.Ticket.Value);
    //               }
    //               else {
    //                 balance = existingBalance; //+ (walletElement.quantity * walletElement.Ticket.Value);
    //               }
    //             }
    //             this.encodeddata[0].forEach(element => {
    //               if (walletElement.Ticket.Group == element.product_type && (walletElement.Ticket.Designator == element.designator)) {
    //                 slotNumber = element.slotNumber;
    //                 status = element.status;
    //               }
    //             });
    //             var jsonWalletObj = {
    //               "transactionID": this.transactionId,
    //               "quantity": walletElement.quantity,
    //               "productIdentifier": walletElement.ProductIdentifier,
    //               "ticketTypeId": walletElement.Ticket.TicketType.TicketTypeId,
    //               "ticketValue": (walletElement.Ticket.Group == 3) ? walletElement.UnitPrice : walletElement.Ticket.Value,
    //               "status": status,
    //               "slotNumber": slotNumber,
    //               "startDate": 0, //(walletElement.DateEffective / (1000 * 60 * 60 * 24)),
    //               "expirationDate": 0,//(walletElement.DateExpires / (1000 * 60 * 60 * 24)),
    //               "balance": balance,
    //               "rechargesPending": rechargesPending,
    //               "IsMerchandise": walletElement.IsMerchandise,
    //               "IsBackendMerchandise": false,
    //               "IsFareCard": false,
    //               "unitPrice": walletElement.UnitPrice,
    //               "totalCost": this.transactionAmount,
    //               "userID": localStorage.getItem("userEmail"),
    //               "shiftID": 1,
    //               "fareCode": fareCode,
    //               "offeringId": walletElement.OfferingId,
    //               "cardPID": element.printed_id,
    //               "cardUID": element.uid,
    //               "walletTypeId": 3,
    //               "shiftType": shiftType,
    //               "timestamp": new Date().getTime()
    //             }
    //             walletObj.push(jsonWalletObj);
    //             slotNumberStatusIndex++;
    //           });
    //           var JsonObj: any = {
    //             "transactionID": this.transactionId,
    //             "cardPID": element.printed_id,
    //             "cardUID": element.uid,
    //             "quantity": (this.isNew) ? 1 : 0,
    //             "productIdentifier": JSON.parse(localStorage.getItem("smartCardProductIndentifier")),
    //             "ticketTypeId": null,
    //             "ticketValue": 0,
    //             "slotNumber": 0,
    //             "expirationDate": element.card_expiration_date,
    //             "balance": 0,
    //             "IsMerchandise": false,
    //             "IsBackendMerchandise": false,
    //             "IsFareCard": true,
    //             "unitPrice": (this.isNew) ? unitPrice : 0,
    //             "totalCost": (this.isNew) ? unitPrice : 0,
    //             "userID": localStorage.getItem("userEmail"),
    //             "shiftID": 1,
    //             "fareCode": fareCode,
    //             "walletContentItems": walletObj,
    //             "walletTypeId": 3,
    //             "shiftType": shiftType,
    //             "timestamp": new Date().getTime()
    //           };
    //           this.JsonObjCardObj.push(JsonObj);

    //         });
    //         if (localStorage.getItem("paymentMethodId") == "8") {
    //           var paymentObj = {
    //             "paymentMethodId": Number(localStorage.getItem("paymentMethodId")),
    //             "amount": this.transactionAmount,
    //             "comment": localStorage.getItem("compReason")
    //           }
    //         } else {
    //           paymentObj = {
    //             "paymentMethodId": Number(localStorage.getItem("paymentMethodId")),
    //             "amount": this.transactionAmount,
    //             "comment": null
    //           }
    //         }
    //         var transactionObj =
    //         {
    //           "userID": localStorage.getItem("userEmail"),
    //           "timestamp": new Date().getTime(),
    //           "transactionID": this.transactionId,
    //           "transactionType": "Charge",
    //           "transactionAmount": this.transactionAmount,
    //           "salesAmount": this.transactionAmount,
    //           "taxAmount": 0,
    //           "items": this.JsonObjCardObj,
    //           "payments": [paymentObj],
    //           "shiftType": shiftType
    //         }
    //         console.log("transObj" + JSON.stringify(transactionObj));
    //         localStorage.setItem("transObj", JSON.stringify(transactionObj))
    //         this.electronService.ipcRenderer.send('savaTransaction', transactionObj);
    //       });
    //     }
    //     else {
    //       $("#encodeErrorModal").modal('show');
    //     }
    //   }
    //   catch (e) {
    //     $("#encodeErrorModal").modal('show');
    //   }
    //   // this.electronService.ipcRenderer.removeAllListeners("generateSequenceNumberSyncResult");
    // });

    var transactionListener: any = this.electronService.ipcRenderer.on('saveTransactionResult', (event, data) => {
      console.log("data", data)
      if (data != undefined && data != "") {
        this._ngZone.run(() => {
          $("#encodeSuccessModal").modal('show');
        });
      } else {
        $("#encodeErrorModal").modal('show');
      }
      // this.electronService.ipcRenderer.removeAllListeners("saveTransactionResult");
    });

    var encodingListener: any = this.electronService.ipcRenderer.on('encodeCardResult', (event, data) => {
      if (data != undefined && data != "") {
        console.log(data);
        this._ngZone.run(() => {
          var resultObj: any = [];
          resultObj = new Array(JSON.parse(data));
          for (let index = 0; index < resultObj.length; index++) {
            this.shoppingCart._walletLineItem[this.cardIndex]._walletContents[index]._slot = resultObj[index][0].slotNumber;
            this.shoppingCart._walletLineItem[this.cardIndex]._walletContents[index]._status = resultObj[index][0].status;
          }
          // resultObj.forEach(element => {

          //   this.shoppingCart._walletLineItem[this.cardIndex]._walletContents[]
          //   // this.encodeddata.push(element);
          // });
          if (this.isSmartCardFound()) {
            this.populatCurrentCard();
            this.getSmartCardWalletContents();
          }
          else {
            this.initiateSaveTransaction()
          }
        });
      }
      else {
        $("#encodeErrorModal").modal('show');
      }
    });

  }

  initiateSaveTransaction() {
    var expirationDate: String = (new Date().getMonth() + 1) + "/" + new Date().getDate() + "/" + (new Date().getFullYear() + 10);
    this.isFromCardComponent = true;
    if (this.isNew) {
      this.electronService.ipcRenderer.send("updateCardData", cardName, expirationDate);
    }
    else {
      this.electronService.ipcRenderer.send('readSmartcard', cardName)
    }
    let userID = localStorage.getItem('userID');
       
    let transactionObj = TransactionService.getInstance.saveTransaction(this.shoppingCart, this.getUserByUserID(userID), this.getPaymentsObject);
    debugger;
    this.electronService.ipcRenderer.send('savaTransaction', transactionObj);
  }

  getUserByUserID(userID){
    let userData = null;
    let userJSON = JSON.parse(localStorage.getItem('shiftReport'));
    for(let user of userJSON){
      if(user.userID ==  userID){
        userData = user;
        break
      }
    }
    return userData;
  }

  getPaymentsObject() {
    var paymentObj: any
    let transactionAmount = localStorage.getItem('transactionAmount');
    if (localStorage.getItem("paymentMethodId") == "8") {
      paymentObj = {
        "paymentMethodId": Number(localStorage.getItem("paymentMethodId")),
        "amount": transactionAmount,
        "comment": localStorage.getItem("compReason")
      }
    } else {
      paymentObj = {
        "paymentMethodId": Number(localStorage.getItem("paymentMethodId")),
        "amount": transactionAmount,
        "comment": null
      }
    }
    return paymentObj;
  }

  populatCurrentCard() {
    this.cardJson.forEach(element => {
      if (element.printed_id == this.shoppingCart._walletLineItem[this.cardIndex]._cardPID) {
        this.currentCard = element;
      }
    });
  }


  isSmartCardFound() {
    let index = 0;
    let nextItemFound: Boolean = false;
    for (let iterator of this.shoppingCart._walletLineItem) {
      if (iterator._walletTypeId == MediaType.SMART_CARD_ID) {
        if (index > this.cardIndex) {
          nextItemFound = true;
          break;
        }
      }
      index++;
    }
    if (nextItemFound) {
      this.cardIndex = index;
    }
    return nextItemFound;
  }

  getSmartCardWalletContents() {
    this.currentCardProductList = this.shoppingCart._walletLineItem[this.cardIndex]._walletContents;
  }

  navigateToDashboard() {
    var timestamp = new Date().getTime();
    // this.generateReceipt(timestamp);
    localStorage.removeItem('encodeData');
    localStorage.removeItem('productCardData');
    localStorage.removeItem("cardsData");
    localStorage.removeItem("catalogJSON");
    localStorage.removeItem("readCardData");
    this.electronService.ipcRenderer.removeAllListeners("readCardResult");
    this.electronService.ipcRenderer.removeAllListeners("getCardPIDResult");
    this.electronService.ipcRenderer.removeAllListeners("generateSequenceNumberSyncResult");
    this.electronService.ipcRenderer.removeAllListeners("saveTransactionResult");
    this.electronService.ipcRenderer.removeAllListeners("encodeCardResult");
    this.electronService.ipcRenderer.removeAllListeners("updateCardDataResult");
    this.electronService.ipcRenderer.removeAllListeners("printReceiptResult");
    this.router.navigate(['/readcard'])
  }

  printDiv() {
    // var printContents = document.getElementById(divName).innerHTML;
    // var originalContents = document.body.innerHTML;
    // document.body.innerHTML = printContents;
    // this.electronService.ipcRenderer.send("printPDF", printContents);
    window.print();
    //  document.body.innerHTML = originalContents;
  }

  ngOnInit() {

  }

  removeEventListeners() {

  }

  navigateToReadCard() {
    localStorage.removeItem('encodeData');
    localStorage.removeItem('productCardData');
    localStorage.removeItem("cardsData");
    localStorage.removeItem("catalogJSON");
    localStorage.removeItem("readCardData");
    this.electronService.ipcRenderer.removeAllListeners("readCardResult");
    this.electronService.ipcRenderer.removeAllListeners("getCardPIDResult");
    this.electronService.ipcRenderer.removeAllListeners("generateSequenceNumberSyncResult");
    this.electronService.ipcRenderer.removeAllListeners("saveTransactionResult");
    this.electronService.ipcRenderer.removeAllListeners("encodeCardResult");
    this.electronService.ipcRenderer.removeAllListeners("printReceiptResult");
    this.router.navigate(['/readcard'])
  }

  checkIsCardNew() {
    this.isNew = (this.currentCard.products.length == 1 && ((this.currentCard.products[0].product_type == 3) && (this.currentCard.products[0].remaining_value == 0))) ? true : false;
  }

  populatCurrentCardEncodedData() {
    // var dataIndex: any = 0;
    this.currentCardProductList = this.shoppingCart._walletLineItem[this.cardIndex + 1]._walletContents;
    // this.currentCardProductList = this.currentCard._walletContents;
    // this.encodedProductCardData.forEach(element => {
    //   if (element == this.cardJson[this.cardIndex].printed_id) {
    //     this.currentCardProductList.push(this.encodeParseData[dataIndex]);
    //     this.currentExistingProducts.push(this.areExistingProducts[dataIndex]);
    //   }
    //   dataIndex++
    // });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
    }
  }

  ngOnDestroy() {
    this.electronService.ipcRenderer.removeAllListeners("readCardResult");
    this.electronService.ipcRenderer.removeAllListeners("getCardPIDResult");
    this.electronService.ipcRenderer.removeAllListeners("generateSequenceNumberSyncResult");
    this.electronService.ipcRenderer.removeAllListeners("saveTransactionResult");
    this.electronService.ipcRenderer.removeAllListeners("encodeCardResult");
    this.electronService.ipcRenderer.removeAllListeners("printReceiptResult");
  }

  checkCorrectCard() {
    this.populatCurrentCard()
    console.log(cardName);
    this.isFromEncode = true;
    this.electronService.ipcRenderer.send('getCardPID', cardName);
  }

  encodeCard() {
    try {
      console.log("product list data", this.currentCardProductList);
      this.encodeJsonData = [];
      var JsonObj;
      var currentIndex = 0;
      this.currentCardProductList.forEach(element => {
        if (element._offering.Ticket.Group == 1) {
          for (let index = 0; index < element._quantity; index++) {
            var internalJsonObj = this.constructJsonForEncoding(element._offering.Ticket.Group, element);
            this.encodeJsonData.push(internalJsonObj);
          }
        }
        else if (element.Ticket.Group == 2) {
          JsonObj = this.constructJsonForEncoding(element._offering.Ticket.Group, element);
        }
        else if (element.Ticket.Group == 3) {
          JsonObj = this.constructJsonForEncoding(element._offering.Ticket.Group, element);

        }
        if (element._offering.Ticket.Group != 1) {
          this.encodeJsonData.push(JsonObj);
        }
        currentIndex++;
      });

      console.log(this.encodeJsonData);
      this.checkIsCardNew();
      if (this.isNew)
        this.electronService.ipcRenderer.send('encodenewCard', this.currentCard.printed_id, 1, 0, 0, this.encodeJsonData);
      else
        this.electronService.ipcRenderer.send('encodeExistingCard', this.currentCard.printed_id, this.encodeJsonData);
    }
    catch{
      $("#encodeErrorModal").modal('show');
    }
  }

  constructJsonForEncoding(product_type, element) {
    var JsonObjectForProductType: any;
    switch (product_type) {
      case 1:
        JsonObjectForProductType = {
          "product_type": element._offering.Ticket.Group,
          "designator": element._offering.Ticket.Designator,
          "ticket_id": element._offering.Ticket.TicketId,
          "designator_details": 0,
          "start_date_epoch_days": element._offering.Ticket.DateStartEpochDays,
          "exp_date_epoch_days": element._offering.Ticket.DateExpiresEpochDays,
          "is_linked_to_user_profile": false,
          "type_expiration": element._offering.Ticket.ExpirationTypeId,
          "add_time": 240,
          "recharges_pending": 0,//(this.currentExistingProducts[currentIndex]) ? rechargesPending : 0,
          "days": (element._offering.Ticket.Value),
          "isAccountBased": element._isAccountBased,
          "isCardBased": element._isCardBased
        }
        break;
      case 2:
        JsonObjectForProductType = {
          "product_type": element._offering.Ticket.Group,
          "designator": element._offering.Ticket.Designator,
          "ticket_id": element._offering.Ticket.TicketId,
          "designator_details": 0,
          "remaining_rides": (element._quantity * element._offering.Ticket.Value),
          "recharge_rides": 0,//(this.currentExistingProducts[currentIndex]) ? rechargeRides : 0,
          "threshold": 0,
          "is_linked_to_user_profile": false,
          "isAccountBased": element._isAccountBased,
          "isCardBased": element._isCardBased
        }
        break;
      case 3:
        JsonObjectForProductType = {
          "product_type": element._offering.Ticket.Group,
          "designator": element._offering.Ticket.Designator,
          "ticket_id": element._offering.Ticket.TicketId,
          "designator_details": 0,
          "is_linked_to_user_profile": false,
          "remaining_value": (element._offering.quantity * element._offering.Ticket.Value * 100), //(this.currentExistingProducts[currentIndex]) ? remainingValue : (element.Ticket.Price * 100),
          "isAccountBased": element._isAccountBased,
          "isCardBased": element._isCardBased
        }
        break;

      default:
        break;
    }
    return JsonObjectForProductType;
  }

  generateReceipt(timestamp) {

    // TODO: stop using two different ways of getting transaction IDs.
    var paymentsStore
    var transRecord
    var cart
    var transObj = JSON.parse(localStorage.getItem("transObj"))
    var catalog = JSON.parse(localStorage.getItem("catalogJSON"));
    var storedTransactionID = '';
    var taxAmountValue
    paymentsStore = transObj.payments;
    cart = transObj.items
    storedTransactionID = transObj.transactionID;
    taxAmountValue = transObj.taxAmount
    var paymentTypeText = '';
    var receiptWidth = 44;
    var receipt = "";
    var signatureRequired = false;
    var customerCopyReceipt = "";
    var changeDue = 0;
    var padSize = 0;
    var transText = "Trans ID:";

    receipt += transText;
    padSize = receiptWidth - (transText.length + storedTransactionID.length);

    var spacer = '';

    while (spacer.length <= (padSize - 1)) {
      spacer += " ";
    }

    receipt += spacer + storedTransactionID + "\n";

    var transTypeLabel = "Trans Type:";
    var transType = "Sale";

    padSize = receiptWidth - (transTypeLabel.length + transType.length);

    spacer = '';

    while (spacer.length <= (padSize - 1)) {
      spacer += " ";
    }

    receipt += transTypeLabel + spacer + transType + "\n";

    var anythingToPrint = false;

    if (cart.length > 0) {
      console.log("Receipt printing, detected wallets.");
      anythingToPrint = true;
    } else {
      console.log("Receipt printing, did not detect any wallets.");
    }
    // if(cart.ProductLineItems != undefined){
    //   if (cart.ProductLineItems.length > 0) {
    //     console.log("Receipt printing, detected products.");
    //     anythingToPrint = true;
    //   } else {
    //     console.log("Receipt printing, did not detect any products.");
    //   }
    // }


    if (anythingToPrint) {
      console.log("Detected items to print.");
    } else {
      console.warn("Receipt printing, failed to detect anything to print.");
      return;
    }

    // if (cart.ProductLineItems > 0) {
    //   console.log("Receipt printing, detected products.");
    // }

    //Add a spacer due to multiple cards on order
    receipt += "\n";

    var walletContents
    cart.forEach(element => {
      walletContents = element.walletContentItems
      console.log("walletContents", walletContents);
      // var PID = element.cardPID;
      // var cardText = "Card ID:";

      // receipt += cardText;
      // padSize = receiptWidth - (cardText.length + PID.length);
      // spacer = '';

      // while (spacer.length <= (padSize - 1)) {
      //   spacer += " ";
      // }

      // receipt += spacer + PID + "\n";

      // var dashes = "";
      // while (dashes.length <= receiptWidth) {
      //   dashes += "-";
      // }

      // receipt += dashes + "\n";

      // var lineItem = element.description + "";
      // var lineItemQty = " - Qty: 1 ";

      // if (lineItem.length > (35 - lineItemQty.length)) {
      //   lineItem = lineItem.substring(0, (35 - lineItemQty.length));
      // }

      // lineItem = lineItem + lineItemQty + "                                   ";
      // lineItem = lineItem.substring(0, 35);

      // var subtotalStr = "          $" + (element.unitPrice).toFixed(2);

      // subtotalStr = subtotalStr.substring(subtotalStr.length - 10);

      // receipt += lineItem + subtotalStr + "\n\n";


      walletContents.forEach(item => {

        JSON.parse(catalog).Offering.forEach(catalogElement => {
          if (catalogElement.Ticket != undefined) {
            if (catalogElement.ProductIdentifier == item.productIdentifier) {
              //  var catalogdata = {
              //    "ticketid": 
              //  }
              return item.description = catalogElement.Ticket.Description

            }
          }
        });
        var lineItem = item.description + "";
        var lineItemQty = " - Qty: " + item.quantity + " ";

        if (lineItem.length > (35 - lineItemQty.length)) {
          lineItem = lineItem.substring(0, (35 - lineItemQty.length));
        }

        lineItem = lineItem + lineItemQty + "                                   ";
        lineItem = lineItem.substring(0, 35);

        var subtotalStr = "          $" + (item.unitPrice * item.quantity).toFixed(2);

        subtotalStr = subtotalStr.substring(subtotalStr.length - 10);

        receipt += lineItem + subtotalStr + "\n\n";

      })

    });

    // cart.ProductLineItems.forEach(item => {
    //   var lineItem = item.description + "";
    //   var taxAmount = "Tax";
    //   var lineItemQty = " - Qty: " + item.quantity + " ";

    //   if (lineItem.length > (35 - lineItemQty.length)) {
    //     lineItem = lineItem.substring(0, (35 - lineItemQty.length));
    //   }

    //   lineItem = lineItem + lineItemQty + "                                   ";
    //   lineItem = lineItem.substring(0, 35);

    //   var taxtotalStr = "          $" + (item.tax * item.quantity).toFixed(2);
    //   taxtotalStr = taxtotalStr.substring(taxtotalStr.length - 10);
    //   var taxPercentage = ((item.tax * 100) / item.unitPrice).toFixed(2);

    //   taxAmount = taxAmount + "(" + taxPercentage + "%)" + "                                   ";
    //   taxAmount = taxAmount.substring(0, 35);

    //   var subtotalStr = "          $" + (item.unitPrice * item.quantity).toFixed(2);

    //   subtotalStr = subtotalStr.substring(subtotalStr.length - 10);

    //   receipt += lineItem + subtotalStr + "\n";
    //   receipt += taxAmount + taxtotalStr + "\n\n";

    // });

    var totalDue = localStorage.getItem("transactionAmount")
    var taxtotalDue = taxAmountValue
    var faretotalDue = localStorage.getItem("transactionAmount")

    var faretotalStr = "";
    var taxtotalStr = "";

    var totalStr = "";

    if ("0" == totalDue) {
      totalStr = '$0.00';
    } else {
      totalStr = "$" + Number(totalDue).toFixed(2);
    }

    if ("0" == faretotalDue) {
      faretotalStr = '$0.00';
    } else {
      faretotalStr = "$" + Number(faretotalDue).toFixed(2);
    }

    if (0 == taxtotalDue) {
      taxtotalStr = '$0.00';
    } else {
      taxtotalStr = "$" + taxtotalDue.toFixed(2);
    }

    totalStr = "                    " + totalStr;
    faretotalStr = "              " + faretotalStr;
    taxtotalStr = "              " + taxtotalStr;
    totalStr = totalStr.substring(totalStr.length - 20);

    receipt += "\nFare TOTAL:              " + faretotalStr + "\n\n";
    receipt += "\nTax TOTAL:               " + taxtotalStr + "\n\n";

    receipt += "\nTOTAL:                   " + totalStr + "\n\n";

    var paymentAmount = "";
    var paymentId = 0;

    // possible add for payment type and change due
    paymentsStore.forEach(paymentRecord => {
      paymentId = paymentRecord.paymentMethodId;
      paymentTypeText = ""

      switch (paymentId) {
        case 1:
          paymentTypeText = "INVOICED"
          break;
        case 2:
          paymentTypeText = "CASH"
          break;
        case 3:
          paymentTypeText = "CHECK"
          break;
        case 4:
          paymentTypeText = "AMEX"
          break;
        case 5:
          paymentTypeText = "VISA"
          break;
        case 6:
          paymentTypeText = "MASTERCARD"
          break;
        case 7:
          paymentTypeText = "DISCOVER"
          break;
        case 8:
          paymentTypeText = "COMP"
          break;
        case 9:
          paymentTypeText = "CREDIT"
          break;
        case 10:
          paymentTypeText = "FARE_CARD"
          break;
        case 11:
          paymentTypeText = "VOUCHER"
          break;
        case 12:
          paymentTypeText = "STORED_VALUE"
          break;
        default:
          paymentTypeText = "UNKNOWN"
          break;
      }

      // if the payment method is cash, you want to give the full amount tendered.
      //    that is the amount we stored + the change due
      if (null != paymentId) {
        if (2 == paymentId) {
          paymentAmount = "          $" + (changeDue + (paymentRecord.amount)).toFixed(2);
        } else {
          if (paymentRecord.amount != null) {
            paymentAmount = "          $" + (paymentRecord.amount).toFixed(2);
          }
        }
      }

      var paymentTenderedItem = "Payment tendered: " + paymentTypeText + "                                   ";

      paymentTenderedItem = paymentTenderedItem.substring(0, 35);

      paymentAmount = paymentAmount.substring(paymentAmount.length - 10);

      receipt += "\n" + paymentTenderedItem + paymentAmount + "\n";

    });

    // if cash was one of your payment types, figure out if there's any change due
    if (paymentId == 2) {
      var changeDueLabel = "CHANGE DUE:              ";
      var changeDueStr = "";

      changeDueStr = "$" + changeDue.toFixed(2);
      changeDueStr = "                    " + changeDueStr;

      changeDueStr = changeDueStr.substring(changeDueStr.length - 20);

      receipt += "\n" + changeDueLabel + changeDueStr;
    }

    var cardBalance = "",
      textProductType = "",
      remainingRides: any = 0;

    receipt += "\n\n             Current Card Balance\n\n";
    var cardStore = JSON.parse(localStorage.getItem("printCardData"));



    var receiptWidth = 44;
    var dashes = "";
    while (dashes.length <= receiptWidth) {
      dashes += "-";
    }

    receipt += dashes + "\n";
    var PID = cardStore.printed_id;
    var cardText = "Card ID:";
    receipt += cardText;
    padSize = receiptWidth - (cardText.length + PID.length);
    spacer = '';

    while (spacer.length <= (padSize - 1)) {
      spacer += " ";
    }

    receipt += spacer + PID + "\n";

    if (cardStore.products) {

      for (var i = 0; i < cardStore.products.length; i++) {

        var dataItem = cardStore.products[i];

        var productType = dataItem.product_type;
        var designator = dataItem.designator;
        var days = dataItem.days;
        var rechargesPending = dataItem.recharges_pending;
        var remainingValue = dataItem.remaining_value;
        var remainingRides = dataItem.remaining_rides;
        var start_date = dataItem.start_date_str;
        var exp_date = dataItem.exp_date_str;
        var start_date_epoch_days = dataItem.start_date_epoch_days;
        var exp_date_epoch_days = dataItem.exp_date_epoch_days;
        var bad_listed = dataItem.is_prod_bad_listed;
        var textProductType = '';
        var cardBalance = '';
        var productDescription = '';
        var productStatus = '';

        switch (productType) {
          case 1:

            if (exp_date_epoch_days > 1) {
              cardBalance = "Exp: " + exp_date;
            } else {
              cardBalance = (days + 1) + " Days";
            }

            productDescription = (days + 1) + " Day Pass";

            if (rechargesPending > 0) {
              productStatus += " (" + rechargesPending + " Pending)"
            }

            break;
          case 2:
            if (1 == remainingRides) {
              cardBalance = remainingRides + " Ride";
            } else {
              cardBalance = remainingRides + " Rides";
            }
            productDescription = 'Stored Ride Pass';
            break;
          case 3:

            var remaining_value = 0;

            if (dataItem.remaining_value && dataItem.remaining_value > 0) {
              remaining_value = dataItem.remaining_value / 100;
            }

            productDescription = 'Pay As You Go';
            cardBalance = "$" + remaining_value.toFixed(2);

            break;
          case 7:

            productDescription = "Employee Pass";

            if (exp_date_epoch_days > 1) {
              cardBalance = "Exp: " + exp_date;
            }

            break;
          default:
            productDescription = "Unknown Product";
            break;
        }

        // var ticketKey = productType + "_" + designator;

        //  var carddata = new Array(cardStore);

        //  cardStore.products.forEach(cardElement => {
        JSON.parse(catalog).Offering.forEach(catalogElement => {
          if (catalogElement.Ticket != undefined) {
            if (catalogElement.Ticket.Group == productType && (catalogElement.Ticket.Designator == designator)) {
              //  var catalogdata = {
              //    "ticketid": 
              //  }
              return productDescription = catalogElement.Ticket.Description

            }
          }
        });
        // });


        // don't print anything if your stored value is $0
        if ((3 != productType) || (0 < remaining_value)) {

          var receiptWidth = 44;
          var padSize = 0;
          var maxDescriptionLength = receiptWidth - 16;

          if (productDescription.length >= maxDescriptionLength) {
            productDescription = productDescription.substring(0, maxDescriptionLength).trim() + "... ";
          }

          receipt += productDescription;

          padSize = receiptWidth - (productDescription.length + cardBalance.length);

          var spacer = '';

          while (spacer.length <= (padSize - 1)) {
            spacer += " ";
          }

          receipt += spacer + cardBalance + "\n";
        }
      }
      receipt += "\n";
    }
    else {
      console.log("Receipt printing: No smart cards stored.");
    }
    receipt += "\n\n";
    console.log("receipt", receipt)
    // APOS.util.PrintService.printReceipt(receipt, timestamp);
    this.electronService.ipcRenderer.send('printReceipt', receipt, timestamp)
    console.log(receipt + 'generateReceipt receipt ');
    console.log(customerCopyReceipt + 'generateReceipt customerCopyReceipt ');
  }

}


