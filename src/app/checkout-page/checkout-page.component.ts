import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppStateInterface } from '../types/appState.interface';
import { selectPizzas, selectTotalPrice } from '../store/cart/cart.selectors';
import { CartPizza } from '../store/cart/cart.reducer';
import { Router } from '@angular/router';
import { clearCart } from '../store/cart/cart.actions';
import { Pizzeria } from '../types/Pizzeria';
import { City, cityValidator } from '../types/City';
import { PopUpService } from '../select-city-popup/select-city-popup.service';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.component.html',
  styleUrls: ['./checkout-page.component.scss'],
})
export class CheckoutPageComponent implements OnInit {
  paymentMethod: 'credit' | 'cash' = 'credit';
  checkOutForm = this.formBuilder.group({
    name: ['', Validators.required],
    phoneNumber: [
      '+380',
      [Validators.required, Validators.pattern(/\+380\d{3}\d{2}\d{2}\d{2}/gi)],
    ],
    pizzeriaAddress: ['', Validators.required],
    promoCode: [''],
    paymentMethod: ['credit'],
    cardNumber: [''],
    cardExpDate: [''],
    cardCVC: [''],
  });
  pizzas$: Observable<CartPizza[]> = this.store.select(selectPizzas);
  cartTotalPrice$: Observable<number> = this.store.select(selectTotalPrice);

  pizzerias: Pizzeria[] = [];

  discountPercentage: number = 0;
  math = Math;
  selectedCity!: City;

  //shitCode start
  iSshowSelectPizzeriaPopup = false;

  showPopupSelectPizzeria() {
    this.iSshowSelectPizzeriaPopup = true;
    console.log('1');
  }

  hidePopupSelectPizzeria() {
    this.iSshowSelectPizzeriaPopup = false;
  }

  //shitCode end

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private store: Store<AppStateInterface>,
    private router: Router,
    private selectCityPopupService: PopUpService
  ) {}

  ngOnInit(): void {
    this.cartTotalPrice$.subscribe((cartTotalPrice) => {
      if (!cartTotalPrice) {
        this.router.navigate(['/']);
      }
    });
    this.selectCityPopupService.getSelectedCity().subscribe((city) => {
      this.selectedCity = city;
    });

    this.http
      .get<Pizzeria[]>(`/api/pizzeria/?cityId=${this.selectedCity.id}`)
      .subscribe({
        next: (pizzerias) => {
          this.pizzerias = pizzerias;
          // this.checkOutForm.value.pizzeriaAddress = pizzerias[0]?.address || '';
          console.log(pizzerias);
        },
      });
  }

  checkPromoCode(): void {
    if (this.checkOutForm.value.promoCode?.length) {
      this.http
        .get<{ valid: boolean; percentage: number }>(
          `/api/promocode/?promocode=${this.checkOutForm.value.promoCode}`
        )
        .subscribe({
          next: ({ valid, percentage }) => {
            if (!valid) {
              alert('Такого промокоду не існує!');
            } else {
              this.checkOutForm.controls.promoCode.disable();
              this.discountPercentage = percentage;
              alert('Промокод успішно використано!');
            }
          },
        });
    }
  }

  createOrder(): void {
    if (this.checkOutForm.value.paymentMethod === 'credit') {
      const isCardNumberValid =
        this.checkOutForm.value.cardNumber?.length === 23;
      const isExpDateValid = this.checkOutForm.value.cardNumber?.length === 4;
    }
    if (this.checkOutForm.valid) {
      // TODO

      const orderObject: any = {
        paymentMethod: this.paymentMethod,
        pizzas: [],
        promocode: this.checkOutForm.getRawValue().promoCode || '',
        customer: {
          name: this.checkOutForm.value.name,
          phoneNumber: this.checkOutForm.value.phoneNumber,
        },
      };
      this.pizzas$.subscribe((pizzas) => {
        orderObject.pizzas = pizzas;
      });
      this.http
        .post<{ success: boolean }>('/api/order/', orderObject)
        .subscribe(({ success }) => {
          if (success) {
            alert('Замовлення створено успішно!');
            this.store.dispatch(clearCart());
            this.router.navigate(['/']);
          }
        });
    } else {
      alert('Заповніть форму!');
    }
  }

  validateInput(inputName: string): boolean {
    const isInvalid = this.checkOutForm.get(inputName)?.invalid;
    const isTouched = this.checkOutForm.get(inputName)?.touched;
    const isDirty = this.checkOutForm.get(inputName)?.dirty;
    if (isInvalid && (isTouched || isDirty)) {
      return true;
    }
    return false;
  }
}
