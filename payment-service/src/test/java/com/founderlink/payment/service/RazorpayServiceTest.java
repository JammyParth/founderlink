package com.founderlink.payment.service;

import com.founderlink.payment.client.WalletServiceClient;
import com.founderlink.payment.dto.response.CreateOrderResponse;
import com.founderlink.payment.entity.Payment;
import com.founderlink.payment.entity.PaymentStatus;
import com.founderlink.payment.event.PaymentResultEventPublisher;
import com.founderlink.payment.exception.PaymentGatewayException;
import com.founderlink.payment.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class RazorpayServiceTest {

    @Mock
    private RazorpayClient razorpayClient;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentResultEventPublisher paymentResultEventPublisher;

    @Mock
    private WalletServiceClient walletServiceClient;

    @InjectMocks
    private RazorpayService razorpayService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(razorpayService, "keySecret", "dummy_secret");
    }

    @Test
    void createOrder_Success() {
        Long investmentId = 1L;
        Payment payment = new Payment();
        payment.setId(100L);
        payment.setAmount(BigDecimal.valueOf(500));
        payment.setInvestmentId(investmentId);
        payment.setStatus(PaymentStatus.PENDING);

        lenient().when(paymentRepository.findByInvestmentId(investmentId)).thenReturn(Optional.of(payment));

        assertThrows(Exception.class, () -> razorpayService.createOrder(investmentId));
    }

    @Test
    void createOrder_AlreadyCompleted() {
        Long investmentId = 1L;
        Payment payment = new Payment();
        payment.setInvestmentId(investmentId);
        payment.setStatus(PaymentStatus.SUCCESS);

        when(paymentRepository.findByInvestmentId(investmentId)).thenReturn(Optional.of(payment));

        assertThrows(PaymentGatewayException.class, () -> razorpayService.createOrder(investmentId));
    }

    @Test
    void createOrder_Idempotency() {
        Long investmentId = 1L;
        Payment payment = new Payment();
        payment.setInvestmentId(investmentId);
        payment.setAmount(BigDecimal.valueOf(500));
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setRazorpayOrderId("order_existing");

        when(paymentRepository.findByInvestmentId(investmentId)).thenReturn(Optional.of(payment));

        CreateOrderResponse response = razorpayService.createOrder(investmentId);

        assertNotNull(response);
        assertEquals("order_existing", response.getOrderId());
        verifyNoInteractions(razorpayClient);
    }
}
