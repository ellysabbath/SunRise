import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Store & Auth
import { StoreProvider } from './store/StoreContext'
import { AuthProvider } from './context/AuthContext'

// Data providers
import { CartProvider } from './context/CartContext'
import { OrderProvider } from './context/OrderContext'
import { CustomerProvider } from './context/CustomerContext'
import { GRNProvider } from './context/GRNContext'
import { PendingCartProvider } from './context/PendingCartContext'
import { OmbiProvider } from './context/OmbiContext'
import { DukaProvider } from './context/DukaContext'
import { UingizajiProvider } from './context/UingizajiContext'
import { MauzoProvider } from './context/MauzoContext'
import { ZakaProvider } from './context/ZakaContext'
import { NotificationProvider } from './context/NotificationContext'
import { OrderAdminProvider } from './context/OrderAdminContext'
import { RipotiBidhaaProvider } from './context/RipotiBidhaaContext'
import { StokiProvider } from './context/StokiContext'
import { DocumentProvider } from './context/DocumentContext'
import { MshaharaProvider } from './context/MshaharaContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <CustomerProvider>
            <CartProvider>
              <OrderProvider>
                <GRNProvider>
                  <PendingCartProvider>
                    <OmbiProvider>
                      <DukaProvider>
                        <UingizajiProvider>
                          <MauzoProvider>
                            <ZakaProvider>
                              <NotificationProvider>
                                <OrderAdminProvider>
                                  <RipotiBidhaaProvider>
                                    <StokiProvider>
                                      <DocumentProvider>
                                        <MshaharaProvider>
                                          <App />
                                        </MshaharaProvider>
                                      </DocumentProvider>
                                    </StokiProvider>
                                  </RipotiBidhaaProvider>
                                </OrderAdminProvider>
                              </NotificationProvider>
                            </ZakaProvider>
                          </MauzoProvider>
                        </UingizajiProvider>
                      </DukaProvider>
                    </OmbiProvider>
                  </PendingCartProvider>
                </GRNProvider>
              </OrderProvider>
            </CartProvider>
          </CustomerProvider>
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>
)