import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { PublicLayoutComponent } from './layout/public-layout/public-layout';
import { LoginComponent } from './features/auth/login/login';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { OfferListComponent } from './features/offers/offer-list/offer-list.component';
import { CitiesCrudComponent } from './features/admin/cities-crud/cities-crud';
import { CategoriesCrud } from './features/admin/categories-crud/categories-crud';
import { StoresCrudComponent } from './features/admin/stores-crud/stores-crud.component';
import { ProductsCrudComponent } from './features/admin/products-crud/products-crud.component';
import { BrandsCrudComponent } from './features/admin/brands-crud/brands-crud.component';
import { ProductSpecsCrudComponent } from './features/admin/product-specs-crud/product-specs-crud.component';
import { BranchesCrudComponent } from './features/admin/branches-crud/branches-crud.component';
import { StoreListComponent } from './features/store/store-list/store-list.component';
import { StoreDetailComponent } from './features/store/store-detail/store-detail.component';

export const routes: Routes = [

    {
        path: '',
        component: PublicLayoutComponent,
        children: [

            {
                path: '',
                component: HomeComponent
            },

            {
                path: 'login',
                component: LoginComponent
            },
            { path: 'offers-list', component: OfferListComponent },
            { path: 'stores', component: StoreListComponent },
            { path: 'stores/:id', component: StoreDetailComponent }

        ]
    },
    {
        path: 'admin',
        component: AdminLayoutComponent,
        children: [
            {
                path: '',
                component: DashboardComponent
            },
            { path: 'cities', component: CitiesCrudComponent },
            { path: 'categories', component: CategoriesCrud },
            { path: 'stores', component: StoresCrudComponent },
            { path: 'stores/:id/branches', component: BranchesCrudComponent },
            { path: 'products', component: ProductsCrudComponent },
            { path: 'brands', component: BrandsCrudComponent },
            {
                path: 'product-specs/:productId/details',
                component: ProductSpecsCrudComponent
            }]
    },

    {
        path: '**',
        redirectTo: ''
    }

];