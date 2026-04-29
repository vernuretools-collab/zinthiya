const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const PROJECT_ID = process.env.PROJECT_ID || JSON.parse(process.env.FIREBASE_CONFIG).projectId;
const GMAIL_USER = functions.config().gmail?.user;
const GMAIL_APP_PASSWORD = functions.config().gmail?.app_password;

// ✅ Initialize Firebase Admin
admin.initializeApp();

// ✅ SECURE CONFIG - Use Firebase Secrets (set with: firebase functions:secrets:set GMAIL_APP_PASSWORD)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  }
});

function formatUK(timestampOrDate) {
  const date = timestampOrDate?.toMillis
    ? new Date(timestampOrDate.toMillis())
    : new Date(timestampOrDate);

  // ✅ Use en-US + 'numeric' to avoid en-GB 12→00 bug
  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Europe/London',
    hour: 'numeric',      // 'numeric' gives "12", not "00"
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();       // → "11:45 am", "12:45 pm", "1:00 pm"

  return {
    dateShort: date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London'
    }),
    time: timeStr,
    full: date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' at ' + timeStr,
  };
}

// ✅ Fetch volunteer details from volunteers collection
async function getVolunteerDetails(volunteerId) {
  if (!volunteerId) return { name: 'Unassigned', email: '', phone: '' };

  try {
    const volunteerDoc = await admin.firestore()
      .collection('volunteers').doc(volunteerId).get();

    if (!volunteerDoc.exists) {
      console.log('⚠️ Volunteer not found:', volunteerId);
      return { name: 'Unassigned', email: '', phone: '' };
    }

    const volunteer = volunteerDoc.data();
    return {
      name: volunteer.full_name || volunteer.email || 'Adviser',
      email: volunteer.email || '',
      phone: volunteer.phone || ''
    };
  } catch (error) {
    console.error('Volunteer lookup error:', error);
    return { name: 'Unassigned', email: '', phone: '' };
  }
}



// ✅ ADMIN EMAILS FROM CONFIG (set with: firebase functions:config:set admin.emails="[\"email1\",\"email2\"]")
const ADMIN_EMAILS = functions.config().admin?.emails
  ? JSON.parse(functions.config().admin.emails)
  : ["zinthiya.trust@gmail.com"];

// 🔥 MAIN BOOKING TRIGGER - Creates cancel token + sends all emails
// 🔥 MAIN BOOKING TRIGGER - Creates cancel token + sends all emails (IDEMPOTENT)
exports.onBookingCreated = functions
  .firestore.document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const bookingId = snap.id;

    console.log(`🎯 Triggered: ${booking?.booking_reference}`);

    if (!booking?.victim_email) {
      console.log('❌ No victim_email');
      return null;
    }

    try {
      // 🔥 PREVENT DUPLICATES
      const sentFlagDoc = await admin.firestore()
        .collection('bookings')
        .doc(bookingId)
        .collection('flags')
        .doc('emails_sent')
        .get();

      if (sentFlagDoc.exists) {
        console.log('✅ Emails already sent - skipping');
        return null;
      }

      // 🔥 GENERATE SECURE TOKENS
      const cancelToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const ratingToken = Math.random().toString(36).substring(2, 15) +  // ← NEW
        Math.random().toString(36).substring(2, 15);

      // 🔥 STORE BOTH TOKENS
      await admin.firestore().collection('cancel_tokens').doc(bookingId).set({
        email: booking.victim_email,
        token: cancelToken,
        rating_token: ratingToken,  // ← NEW
        booking_reference: booking.booking_reference,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
      });

      // 🔥 SEND EMAILS (pass ratingToken)
      console.log('📧 Sending victim email...');
      await sendBookingConfirmationEmail(booking, bookingId, cancelToken, ratingToken);

      if (booking.volunteer_id) {
        console.log('🔔 Sending volunteer email...');
        await sendVolunteerNotificationEmail(booking.volunteer_id, booking, bookingId);
      }

      console.log('👥 Sending admin emails...');
      await sendAdminNotificationEmail(booking);

      // MARK AS SENT
      await admin.firestore()
        .collection('bookings')
        .doc(bookingId)
        .collection('flags')
        .doc('emails_sent')
        .set({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          booking_reference: booking.booking_reference
        });

      console.log(`✅ ALL EMAILS SENT: ${booking.booking_reference}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Email error:', error);
      return null;
    }
  });

// 👥 ADVISER RESCHEDULE (Authenticated — Adviser portal only)
exports.onVolunteerRescheduleBooking = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { bookingId, newDate, reason } = data;

  if (!bookingId || !newDate) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId and newDate required');
  }

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();

  // ✅ Make sure this adviser owns the booking
  if (booking.volunteer_id !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not your booking');
  }

  if (booking.status !== 'upcoming' && booking.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot reschedule this booking');
  }

  const newStartTime = new Date(newDate);
  if (isNaN(newStartTime.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid newDate: ' + newDate);
  }

  const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);

  // ✅ Update booking
  await bookingDoc.ref.update({
    start_time: admin.firestore.Timestamp.fromDate(newStartTime),
    end_time: admin.firestore.Timestamp.fromDate(newEndTime),
    status: 'upcoming',                           // ✅ NOT 'rescheduled'
    rescheduled_by: context.auth.token.email,
    rescheduled_reason: reason || 'Adviser requested reschedule',
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  // ✅ Notify client
  await sendVictimRescheduleEmail(booking, newStartTime, newEndTime, reason);

  // ✅ Adviser self-confirmation
  await sendAdviserRescheduleConfirmationEmail(
    booking, newStartTime, newEndTime, reason, context.auth.token.email
  );

  return { success: true, message: 'Booking rescheduled successfully!' };
});


// 🔥 EMAIL-BASED CANCEL (No page needed!)
exports.onEmailCancelBooking = functions.https.onRequest(async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const { bookingId, email, token } = req.query;

    if (!bookingId || !email || !token) {
      return res.status(400).send(`
        <div style="font-family: Arial; max-width: 500px; margin: 50px auto; text-align: center; padding: 40px;">
          <h2 style="color: #dc2626;">❌ Invalid cancel link</h2>
          <p>Missing required parameters.</p>
          <a href="https://zinthiyatrustsupport.com" style="color: #2563eb;">← Back to Portal</a>
        </div>
      `);
    }

    // ✅ 1. Verify cancel token (24hr expiry + email match)
    const cancelTokenDoc = await admin.firestore()
      .collection('cancel_tokens')
      .doc(bookingId)
      .get();

    if (!cancelTokenDoc.exists ||
      cancelTokenDoc.data().email !== email ||
      cancelTokenDoc.data().token !== token ||
      Date.now() - cancelTokenDoc.data().createdAt.toMillis() > 24 * 60 * 60 * 1000) {
      return res.status(400).send(`
        <div style="font-family: Arial; max-width: 500px; margin: 50px auto; text-align: center; padding: 40px;">
          <h2 style="color: #dc2626;">❌ Invalid or expired cancel link</h2>
          <p style="color: #64748b;">This secure link expires in 24 hours or after one use.</p>
          <a href="https://zinthiyatrustsupport.com" style="color: #2563eb;">← Back to Portal</a>
        </div>
      `);
    }

    // ✅ 2. Get & validate booking
    const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(400).send(`
        <div style="font-family: Arial; max-width: 500px; margin: 50px auto; text-align: center;">
          <h2 style="color: #dc2626;">❌ Booking not found</h2>
        </div>
      `);
    }

    const booking = bookingDoc.data();
    if (booking.status !== 'active' && booking.status !== 'upcoming') {
      return res.status(400).send(`
        <div style="font-family: Arial; max-width: 500px; margin: 50px auto; text-align: center;">
          <h2 style="color: #f59e0b;">⚠️ Cannot cancel</h2>
          <p>This booking is no longer active.</p>
        </div>
      `);
    }

    // ✅ 3. CANCEL BOOKING (triggers status change notifications)
    await admin.firestore().collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      cancelled_by: email,
      cancelled_reason: 'Cancelled ',
      cancelled_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 🔥 NEW: Notify VOLUNTEER + ADMIN
    if (booking.volunteer_id) {
      await sendVolunteerCancelEmail(booking, email, 'client cancelled ');
    }


    // ✅ 4. Delete used token
    await admin.firestore().collection('cancel_tokens').doc(bookingId).delete();

    // ✅ 5. Success page
    res.send(`
      <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 500px; margin: 50px auto; text-align: center; padding: 40px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <div style="background: #10b981; color: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px;">✅</div>
        <h1 style="color: #166534; font-size: 28px; margin: 0 0 10px 0;">Cancelled Successfully!</h1>
        <p style="color: #065f46; font-size: 18px; margin: 0 0 30px 0;">
          <strong>${booking.booking_reference}</strong><br>
          <span style="font-size: 14px;">Your adviser has been notified</span>
        </p>
        <a href="https://zinthiyatrustsupport.com" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 15px rgba(37,99,235,0.3);">
           Book New Appointment
        </a>
      </div>
    `);

  } catch (error) {
    console.error('Email cancel error:', error);
    functions.logger.error('Email cancel failure', { error: error.toString() });
    res.status(500).send(`
      <div style="font-family: Arial; max-width: 500px; margin: 50px auto; text-align: center; padding: 40px;">
        <h2 style="color: #dc2626;">❌ Server error</h2>
        <p>Please try again or contact support.</p>
      </div>
    `);
  }
});


// 🔄 STATUS CHANGE → ADMIN NOTIFICATION
exports.onBookingStatusChanged = functions
  .firestore.document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (newData.status !== oldData.status) {
      console.log(`🔄 Status: ${oldData.status} → ${newData.status}`);

      try {
        await sendAdminStatusChangeEmail(newData, oldData.status, newData.status);
        console.log(`✅ Admin notified: ${newData.booking_reference}`);
      } catch (error) {
        console.error('❌ Admin notification error:', error);
      }
    }
    return null;
  });

// 👤 USER CANCEL (Frontend)
exports.onUserCancelBooking = functions.https.onCall(async (data, context) => {
  const { bookingId, userEmail, reason } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();
  if (booking.status !== 'active' && booking.status !== 'upcoming') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel this booking');
  }

  await admin.firestore().collection('bookings').doc(bookingId).update({
    status: 'cancelled',
    cancelled_by: userEmail,
    cancelled_reason: reason || 'No reason provided',
    cancelled_at: admin.firestore.FieldValue.serverTimestamp()
  });

  // 🔥 VOLUNTEER notification
  console.log('🔍 User cancel debug:', {
    bookingId,
    volunteer_id: booking.volunteer_id,
    volunteer_email: booking.volunteer_email || 'MISSING'
  });

  if (booking.volunteer_id) {
    console.log('🚀 Calling sendVolunteerCancelEmail...');
    await sendVolunteerCancelEmail(booking, userEmail, reason);
  } else {
    console.log('⚠️ No volunteer_id - skipping volunteer email');
  }



  return { success: true, message: 'Booking cancelled!' };
});


// 👥 VOLUNTEER RESCHEDULE (Frontend)
// ✅ Your React sends: { bookingId, newStartTime, reason }
exports.onVolunteerReschedule = functions.https.onCall(async (data, context) => {
  const { bookingId, newStartTime, reason } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId required');
  }

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();
  if (booking.status !== 'upcoming' && booking.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot reschedule completed/cancelled bookings');
  }

  // Calculate new end time (1 hour default)
  const newEndTime = new Date(new Date(newStartTime).getTime() + 60 * 60 * 1000);

  await bookingDoc.ref.update({
    start_time: admin.firestore.Timestamp.fromDate(new Date(newStartTime)),
    end_time: admin.firestore.Timestamp.fromDate(newEndTime),
    status: 'rescheduled',
    rescheduled_by: context.auth.token.email,
    rescheduled_reason: reason || 'Adviser requested reschedule',
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  // 🔥 VICTIM notification
  await sendVictimRescheduleEmail(booking, newStartTime, newEndTime, reason);



  return { success: true, message: 'Booking rescheduled successfully!' };
});




// 🚫 VOLUNTEER CANCEL (Auto-detects + notifies victim ONLY)
exports.onVolunteerCancel = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const volunteerId = context.auth.uid;
  const reason = data.reason || 'Adviser unavailable';

  console.log(`🧑 Volunteer ${volunteerId} cancelling...`);

  try {
    const now = admin.firestore.Timestamp.now();
    const upcomingBookings = await admin.firestore()
      .collection('bookings')
      .where('volunteer_id', '==', volunteerId)
      .where('status', 'in', ['upcoming', 'active'])
      .where('start_time', '>', now)
      .orderBy('start_time')
      .limit(1)
      .get();

    if (upcomingBookings.empty) {
      throw new functions.https.HttpsError('not-found', 'No upcoming bookings found');
    }

    const bookingDoc = upcomingBookings.docs[0];
    const booking = bookingDoc.data();

    console.log(`📋 Cancelling: ${booking.booking_reference}`);

    await bookingDoc.ref.update({
      status: 'cancelled',
      cancelled_by: context.auth.token.email,
      cancelled_reason: reason,
      cancelled_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 🔥 VICTIM notification
    await sendVictimCancelEmail(booking, context.auth.token.email, reason);




    return {
      success: true,
      message: `Cancelled: ${booking.booking_reference}`,
      bookingRef: booking.booking_reference
    };

  } catch (error) {
    console.error('Volunteer cancel error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 🔥 VICTIM RESCHEDULE (Frontend/App) - IDENTICAL TO VOLUNTEER
// 🔥 VICTIM RESCHEDULE (Email Token Validation - NO AUTH)
exports.sendVictimRescheduleNotification = functions.https.onCall(async (data, context) => {
  const { bookingId, newDate, reason, victimEmail, cancelToken } = data;

  // ✅ VALIDATE cancel token exists (from confirmation email)
  const cancelTokenDoc = await admin.firestore()
    .collection('cancel_tokens')
    .doc(bookingId)
    .get();

  if (!cancelTokenDoc.exists ||
    cancelTokenDoc.data().email !== victimEmail ||
    cancelTokenDoc.data().token !== cancelToken) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid reschedule token');
  }

  // ✅ VALIDATE newDate (ISO string)
  if (!newDate || typeof newDate !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'newDate must be valid ISO date string');
  }

  const newStartTime = new Date(newDate);
  if (isNaN(newStartTime.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid newDate: ${newDate}`);
  }

  // ✅ Get booking & validate victim email
  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();
  if (booking.victim_email !== victimEmail) {
    throw new functions.https.HttpsError('permission-denied', 'Not your booking');
  }

  if (booking.status !== 'upcoming' && booking.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot reschedule completed/cancelled bookings');
  }

  // ✅ Calculate new end time (+1hr)
  const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);

  // 🔥 UPDATE BOOKING (triggers admin notification)
  await bookingDoc.ref.update({
    start_time: admin.firestore.Timestamp.fromDate(newStartTime),
    end_time: admin.firestore.Timestamp.fromDate(newEndTime),
    status: 'upcoming',
    rescheduled_by: victimEmail,
    rescheduled_reason: reason || 'Victim requested reschedule',
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  await sendVolunteerRescheduleEmail(booking, newStartTime, newEndTime, reason);

  return {
    success: true,
    // ✅ Fixed: added timeZone so message shows UK time, not UTC
    message: `Booking rescheduled to ${newStartTime.toLocaleString('en-GB', { timeZone: 'Europe/London' })}!`
  };
});



// 📧 1. VICTIM CONFIRMATION WITH CANCEL + RESCHEDULE BUTTONS
// 🔥 FULL CODE with SEPARATE rating tokens
// 🔥 FULL CODE - FIXED EMAIL (ALL stars → ratingBaseUrl ONLY)
async function sendBookingConfirmationEmail(booking, bookingId, cancelToken, ratingToken) {
  const start = formatUK(booking.start_time);
  const end = formatUK(booking.end_time);

  const PROJECT_ID_VAL = process.env.PROJECT_ID || JSON.parse(process.env.FIREBASE_CONFIG).projectId;

  const ratingTokenGenerated = require('crypto').randomBytes(32).toString('hex');

  await admin.firestore().collection('cancel_tokens').doc(bookingId).set({
    email: booking.victim_email,
    cancel_token: cancelToken,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    used: false
  }, { merge: true });

  await admin.firestore().collection('rating_tokens').doc(bookingId).set({
    email: booking.victim_email,
    rating_token: ratingTokenGenerated,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    used: false
  }, { merge: true });

  const rescheduleUrl = `https://us-central1-${PROJECT_ID_VAL}.cloudfunctions.net/onEmailRescheduleBooking?bookingId=${bookingId}&email=${encodeURIComponent(booking.victim_email)}&token=${cancelToken}`;
  const cancelUrl = `https://us-central1-${PROJECT_ID_VAL}.cloudfunctions.net/onEmailCancelBooking?bookingId=${bookingId}&email=${encodeURIComponent(booking.victim_email)}&token=${cancelToken}`;
  const ratingBaseUrl = `https://us-central1-${PROJECT_ID_VAL}.cloudfunctions.net/onEmailRateBooking?bookingId=${bookingId}&email=${encodeURIComponent(booking.victim_email)}&token=${ratingTokenGenerated}`;

  const mailOptions = {
    from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
    to: booking.victim_email,
    replyTo: '',
    subject: `✅ ${booking.booking_reference} - Appointment Confirmed`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc;">
        <table role="presentation" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 2rem; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Appointment Confirmed!</h1>
              <p style="font-size: 1.1rem; opacity: 0.95; margin: 0.5rem 0 0 0;">Ref: ${booking.booking_reference}</p>
            </div>

            <div style="max-width: 600px; margin: 0 auto; padding: 2rem; background: #f8fafc;">
              <h2 style="font-size: 24px; margin-bottom: 1rem;">Hello ${booking.victim_name},</h2>
              <p style="font-size: 16px; margin-bottom: 1.5rem;">Your appointment with <strong>Zinthiya Ganeshpanchan Trust</strong> is confirmed.</p>

              <div style="background: white; border-radius: 12px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; font-size: 20px; color: #1f2937;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
                  <tr>
                    <td style="padding: 0.75rem; font-weight: 600; background: #f1f5f9; width: 120px;">Date</td>
                    <td style="padding: 0.75rem;">${start.dateShort}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.75rem; font-weight: 600; background: #f1f5f9;">Time</td>
                    <td style="padding: 0.75rem;">${start.time} - ${end.time}</td>
                  </tr>
                  <tr> 
                    <td style="padding: 0.75rem; font-weight: 600; background: #f1f5f9;">Type</td>
                    <td style="padding: 0.75rem;">${booking.consultation_type === 'phone' ? '📞 Phone Call' : '🏥 In-Person'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.75rem; font-weight: 600; background: #f1f5f9;">Reference</td>
                    <td style="padding: 0.75rem;"><strong>${booking.booking_reference}</strong></td>
                  </tr>
                </table>
              </div>

              <!-- ✅ REQUIRED DOCUMENTS SECTION — ADDED HERE -->
              <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 1.5rem 2rem; margin: 2rem 0;">
                <h3 style="color: #92400e; margin-top: 0; font-size: 20px;">📋 Required Documents</h3>
                <p style="color: #78350f; font-size: 15px; margin-bottom: 1rem;">
                  In order for us to complete your appointment, you will need to have access to the following documents:
                </p>
                <ul style="color: #78350f; font-size: 15px; padding-left: 1.2rem; margin: 0 0 1rem 0; line-height: 1.8;">
                  <li><strong>Universal Credit Statements</strong> – This needs to be the most recent award letter, showing all pages.</li>
                  <li><strong>Bank Statements</strong> – These need to be the last two months' bank statements in full, all pages for all accounts that you have. (If there are other household members over the age of 18, we will need to see their bank statements as well, for all accounts they have in their name.)</li>
                  <li><strong>3 Months Payslips</strong> (IF CURRENTLY EMPLOYED)</li>
                  <li><strong>Energy Bills</strong></li>
                </ul>
                <p style="color: #78350f; font-size: 15px; margin: 0;">
                  Please note, if you are coming for a <strong>Debt appointment</strong>, please bring any and all paperwork regarding any debts you have.
                </p>
                <p style="color: #78350f; font-size: 15px; margin: 0;">
                 Please be prepared with your <strong>Visa information </strong> as this may impact the advice you are given.
                </p>
                <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 0.75rem 1rem; border-radius: 6px; margin-top: 1rem;">
                  <p style="color: #92400e; font-weight: 700; margin: 0; font-size: 15px;">
                    ⚠️ Without these documents we will not be able to complete your appointment.
                  </p>
                </div>
              </div>

              <!-- RESCHEDULE BUTTON -->
              <div style="text-align: center; background: linear-gradient(135deg, #10b981, #059669); padding: 2rem; border-radius: 16px; margin: 2rem 0; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
                <h3 style="color: white; margin: 0 0 1rem 0; font-size: 22px; font-weight: 700;">⏰ Need a different time?</h3>
                <p style="color: #ecfdf5; margin: 0 0 1.5rem 0; font-size: 16px;">Reschedule before 24hrs of your appointment</p>
                <a href="${rescheduleUrl}"
                   style="display: inline-block !important;background: white !important;color: #059669 !important;padding: 18px 36px !important;text-decoration: none !important;border-radius: 14px !important;font-weight: 800 !important;font-size: 18px !important;box-shadow: 0 8px 25px rgba(0,0,0,0.2) !important;border: 3px solid #10b981 !important;text-align: center !important;min-width: 300px !important;line-height: 1.2 !important;">
                  🔄 Reschedule Appointment
                </a>
                <p style="font-size: 13px; color: #6ee7b7; margin-top: 1rem;">🆓 Free • Available slots shown</p>
              </div>

              <!-- CANCEL BUTTON -->
              <div style="text-align: center; background: #fef2f2; padding: 1.5rem; border-radius: 12px; border-left: 5px solid #ef4444; margin: 1.5rem 0;">
                <h3 style="color: #dc2626; margin-top: 0; font-size: 20px;">Need to cancel?</h3>
                <p style="color: #7f1d1d; margin-bottom: 1rem; font-size: 16px;">Click below to instantly cancel</p>
                <a href="${cancelUrl}"
                   style="display: inline-block !important;background: linear-gradient(135deg, #ef4444, #dc2626) !important;color: white !important;padding: 16px 32px !important;text-decoration: none !important;border-radius: 12px !important;font-weight: 600 !important;font-size: 16px !important;box-shadow: 0 6px 20px rgba(239,68,68,0.4) !important;border: none !important;text-align: center !important;min-width: 260px !important;line-height: 1.2 !important;">
                  🚫 Cancel Appointment Instantly
                </a>
              </div>

              <!-- RATING -->
              <div style="text-align: center; background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 2.5rem; border-radius: 20px; margin: 2rem 0; box-shadow: 0 15px 35px rgba(245, 158, 11, 0.4);">
                <div style="background: white; width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 6px 20px rgba(0,0,0,0.2);"></div>
                <h2 style="color: #92400e; font-size: 28px; margin: 0 0 1rem 0; font-weight: 800;">Rate Your Adviser</h2>
                <p style="color: #92400e; font-size: 18px; margin: 0 0 2.5rem 0; font-weight: 500;">Click any star after your session</p>
                <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 2rem; font-size: 42px;">
                  <a href="${ratingBaseUrl}" style="color: #f3f4f6; text-decoration: none; padding: 8px 12px; display: inline-block; border-radius: 12px;">⭐</a>
                  <a href="${ratingBaseUrl}" style="color: #f3f4f6; text-decoration: none; padding: 8px 12px; display: inline-block; border-radius: 12px;">⭐</a>
                  <a href="${ratingBaseUrl}" style="color: #f3f4f6; text-decoration: none; padding: 8px 12px; display: inline-block; border-radius: 12px;">⭐</a>
                  <a href="${ratingBaseUrl}" style="color: #f3f4f6; text-decoration: none; padding: 8px 12px; display: inline-block; border-radius: 12px;">⭐</a>
                  <a href="${ratingBaseUrl}" style="color: #f3f4f6; text-decoration: none; padding: 8px 12px; display: inline-block; border-radius: 12px;">⭐</a>
                </div>
                <p style="font-size: 14px; color: #d97706; margin-top: 1.5rem; font-weight: 500;">🔒 Secure • Interactive • Expires 24hrs</p>
              </div>

              

            </div>

            <div style="background: #f8fafc; padding: 1.5rem; text-align: center; font-size: 14px; color: #64748b; border-radius: 0 0 12px 12px;">
              <p>Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
            </div>
          </td>
        </tr>
        </table>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Victim confirmation → ${booking.victim_email}`);
}





// 📧 2. VOLUNTEER NOTIFICATION (FIXED HTML STRUCTURE)
async function sendVolunteerNotificationEmail(volunteerId, booking, bookingId) {
  try {
    const volunteerDoc = await admin.firestore().collection('volunteers').doc(volunteerId).get();
    if (!volunteerDoc.exists) {
      console.log(`⚠️ Volunteer ${volunteerId} not found`);
      return;
    }

    const volunteer = volunteerDoc.data();
    const start = formatUK(booking.start_time);
    const end = formatUK(booking.end_time);

    const mailOptions = {
      from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
      to: volunteer.email,
      subject: `🔔 New Booking: ${booking.booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc;">
          <table role="presentation" width="100%" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981; font-size: 28px; margin-bottom: 1rem;">New Booking Assigned!</h2>
                <p style="font-size: 18px; margin-bottom: 1.5rem;">Hello ${volunteer.full_name || 'Adviser'},</p>

                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-radius: 12px; margin: 1rem 0; text-align: center;">
                  <h3 style="margin: 0; font-size: 24px;">📅 ${start.dateShort} at ${start.time}</h3>
                </div>

                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Reference:</strong> ${booking.booking_reference}</p>
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Client:</strong> ${booking.victim_name}</p>
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Client Phone:</strong> ${booking.victim_phone}</p>
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Time:</strong> ${start.time} - ${end.time}</p>
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Type:</strong> ${booking.consultation_type === 'phone' ? '📞 Phone Call' : '🏥 In-Person'}</p>
                  <p style="margin: 0.5rem 0; font-size: 16px;"><strong>Language:</strong> ${booking.preferred_language?.toUpperCase()}</p>
                </div>

                <div style="text-align: center; background: #fffbeb; padding: 1.5rem; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 2rem 0;">
                  <h3 style="color: #d97706; margin-top: 0; font-size: 20px;">Manage Your Booking</h3>
                  <p style="color: #92400e; margin-bottom: 1.5rem; font-size: 16px;">Log into your Adviser portal</p>
                  <a href="https://zinthiyatrustsupport.com/volunteer/bookings/${bookingId}/reschedule"
                     style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 15px;">
                    🔄 Reschedule
                  </a>
                  <a href="https://zinthiyatrustsupport.com/volunteer/bookings/${bookingId}/cancel"
                     style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    🚫 Cancel
                  </a>
                </div>

                <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 1rem 0;">
                  <p style="margin: 0; font-size: 16px;">💡 <strong>Action Required:</strong> Log into your Adviser portal to view full details and notes.</p>
                </div>
              </div>

              <div style="background: #f8fafc; padding: 1.5rem; text-align: center; font-size: 14px; color: #64748b; margin-top: 2rem;">
                <p>Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
              </div>
            </td>
          </tr>
          </table>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`🔔 Volunteer notification → ${volunteer.email}`);
  } catch (error) {
    console.error('Volunteer email error:', error);
  }
}

// ✅ NEW — Adviser cancel self-confirmation
async function sendAdviserCancelConfirmationEmail(booking, adviserEmail, reason) {
  const start = formatUK(booking.start_time);
  try {
    await transporter.sendMail({
      from: 'Zinthiya Trust <noreply@zinthiyatrust.org>',
      to: adviserEmail,
      subject: `✅ You Cancelled — ${booking.booking_reference}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:1.5rem;border-radius:12px;text-align:center;margin-bottom:1.5rem;">
            <h2 style="margin:0;font-size:24px;">Booking Cancelled</h2>
            <p style="margin:0.5rem 0 0;opacity:0.9;">You cancelled this appointment</p>
          </div>
          <div style="background:#fee2e2;padding:20px;border-radius:12px;border-left:5px solid #dc2626;margin-bottom:1.5rem;">
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Reference:</strong> ${booking.booking_reference}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Client:</strong> ${booking.victim_name}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong> Date:</strong> ${start.dateShort}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong> Time:</strong> ${start.time}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          </div>
          <div style="background:#dbeafe;padding:15px;border-radius:8px;border-left:4px solid #3b82f6;">
            <p style="margin:0;font-size:15px;">✅ The client <strong>${booking.victim_name}</strong> has been notified by email.</p>
          </div>
          <div style="background:#f8fafc;padding:1rem;border-radius:8px;text-align:center;margin-top:2rem;">
            <p style="font-size:13px;color:#64748b;">Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
          </div>
        </body></html>
      `
    });
    console.log('✅ Adviser cancel confirmation sent to', adviserEmail);
  } catch (err) {
    console.error('Adviser cancel confirmation email failed:', err);
  }
}

// ✅ NEW — Adviser reschedule self-confirmation
async function sendAdviserRescheduleConfirmationEmail(booking, newStartTime, newEndTime, reason, adviserEmail) {
  const start = formatUK(newStartTime);
  const end = formatUK(newEndTime);
  try {
    await transporter.sendMail({
      from: 'Zinthiya Trust <noreply@zinthiyatrust.org>',
      to: adviserEmail,
      subject: `🔄 You Rescheduled — ${booking.booking_reference}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:1.5rem;border-radius:12px;text-align:center;margin-bottom:1.5rem;">
            <h2 style="margin:0;font-size:24px;">Booking Rescheduled</h2>
            <p style="margin:0.5rem 0 0;opacity:0.9;">You rescheduled this appointment</p>
          </div>
          <div style="background:#fef3c7;padding:20px;border-radius:12px;border-left:5px solid #f59e0b;margin-bottom:1.5rem;">
            <h3 style="margin-top:0;color:#92400e;">New Appointment Details</h3>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Reference:</strong> ${booking.booking_reference}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Client:</strong> ${booking.victim_name}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>New Date:</strong> ${start.dateShort}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>New Time:</strong> ${start.time} – ${end.time}</p>
            <p style="margin:0.4rem 0;font-size:16px;"><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          </div>
          <div style="background:#dbeafe;padding:15px;border-radius:8px;border-left:4px solid #3b82f6;">
            <p style="margin:0;font-size:15px;">✅ The client <strong>${booking.victim_name}</strong> has been notified of the new time by email.</p>
          </div>
          <div style="background:#f8fafc;padding:1rem;border-radius:8px;text-align:center;margin-top:2rem;">
            <p style="font-size:13px;color:#64748b;">Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
          </div>
        </body></html>
      `
    });
    console.log('✅ Adviser reschedule confirmation sent to', adviserEmail);
  } catch (err) {
    console.error('Adviser reschedule confirmation email failed:', err);
  }
}


// 📧 3-6. All other email functions (unchanged but with proper table structure)
async function sendAdminNotificationEmail(booking) {
  try {
    if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'rescheduled') {
      console.log(`⏭️ Skipping admin notification - status: ${booking.status}`);
      return;
    }

    let volunteerName = 'Unassigned';
    if (booking.volunteer_id) {
      const volunteerDoc = await admin.firestore().collection('volunteers').doc(booking.volunteer_id).get();
      if (volunteerDoc.exists) {
        volunteerName = volunteerDoc.data().full_name || volunteerDoc.data().email || booking.volunteer_id;
      }
    }

    const start = formatUK(booking.start_time); // ✅ FIXED

    for (const adminEmail of ADMIN_EMAILS) {
      const mailOptions = {
        from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
        to: adminEmail,
        subject: `🔔 NEW BOOKING: ${booking.booking_reference}`,
        html: getAdminNotificationHtml(booking, start, volunteerName)
      };
      await transporter.sendMail(mailOptions);
      console.log(`👥 Admin → ${adminEmail}`);
    }
  } catch (error) {
    console.error('Admin email error:', error);
  }
}



async function sendAdminStatusChangeEmail(booking, oldStatus, newStatus) {
  try {
    let volunteerName = booking.volunteer_name || 'Unassigned';
    if (booking.volunteer_id && !booking.volunteer_name) {
      const volunteerDoc = await admin.firestore().collection('volunteers').doc(booking.volunteer_id).get();
      if (volunteerDoc.exists) {
        volunteerName = volunteerDoc.data().full_name || volunteerDoc.data().email || booking.volunteer_id;
      }
    }

    const statusColors = {
      cancelled: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' },
      rescheduled: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
      completed: { bg: '#f0fdf4', border: '#10b981', text: '#166534' },
      no_show: { bg: '#f3f4f6', border: '#6b7280', text: '#4b5563' }
    };

    const color = statusColors[newStatus] || statusColors.cancelled;
    const start = formatUK(booking.start_time); // ✅ FIXED

    for (const adminEmail of ADMIN_EMAILS) {
      const mailOptions = {
        from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
        to: adminEmail,
        subject: `🔄 ${newStatus.toUpperCase()}: ${booking.booking_reference}`,
        html: getAdminStatusChangeHtml(booking, oldStatus, newStatus, color, start, volunteerName)
      };
      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    console.error('Admin status change email error:', error);
  }
}



async function sendVictimCancelEmail(booking, cancelledBy, reason) {
  const start = formatUK(booking.start_time);

  // ✅ Lookup volunteer details from volunteers collection
  let volunteerName = 'Your adviser';
  let volunteerEmail = 'Not available';
  let volunteerPhone = 'Not available';

  if (booking.volunteer_id) {
    try {
      const volunteerDoc = await admin.firestore().collection('volunteers').doc(booking.volunteer_id).get();
      if (volunteerDoc.exists) {
        const v = volunteerDoc.data();
        volunteerName = v.full_name || volunteerName;
        volunteerEmail = v.email || volunteerEmail;
        volunteerPhone = v.phone || volunteerPhone;
      }
    } catch (err) {
      console.error('Volunteer lookup failed in sendVictimCancelEmail:', err);
    }
  }

  await transporter.sendMail({
    from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
    to: booking.victim_email,
    subject: `❌ CANCELLED: ${booking.booking_reference}`,
    html: getVictimCancelHtml(booking, cancelledBy, reason, start, volunteerName, volunteerEmail, volunteerPhone)
  });
}



async function sendVictimRescheduleEmail(booking, newStartTime, newEndTime, reason) {
  const oldStart = formatUK(booking.start_time);
  const start = formatUK(newStartTime);
  const end = formatUK(newEndTime);

  // ✅ ADD THIS VOLUNTEER LOOKUP
  let volunteerName = 'Your adviser';
  let volunteerEmail = 'Not available';
  let volunteerPhone = 'Not available';

  if (booking.volunteer_id) {
    try {
      const volunteerDoc = await admin.firestore()
        .collection('volunteers').doc(booking.volunteer_id).get();
      if (volunteerDoc.exists) {
        const v = volunteerDoc.data();
        volunteerName = v.full_name || volunteerName;
        volunteerEmail = v.email || volunteerEmail;
        volunteerPhone = v.phone || volunteerPhone;
      }
    } catch (err) {
      console.error('Volunteer lookup failed:', err);
    }
  }


  await transporter.sendMail({
    from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
    to: booking.victim_email,
    subject: `🔄 RESCHEDULED: ${booking.booking_reference}`,
    html: `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">📅 Your Appointment Has Been Rescheduled</h2>

        <!-- ✅ ADD THIS OLD TIME BLOCK -->
        <div style="background: #fee2e2; padding: 20px; border-radius: 12px; border-left: 5px solid #dc2626; margin: 1rem 0;">
          <h3 style="margin-top: 0; color: #dc2626;">❌ Previous Appointment</h3>
          <p><strong>Date:</strong> ${oldStart.dateShort}</p>
          <p><strong>Time:</strong> ${oldStart.time}</p>
        </div>

        <!-- New appointment details — unchanged -->
        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 1rem 0;">
          <h3 style="margin-top: 0;">✅ New Appointment Details</h3>
          <p><strong>Date:</strong> ${start.dateShort}</p>
          <p><strong>Time:</strong> ${start.time} - ${end.time}</p>
          <p><strong>Reference:</strong> ${booking.booking_reference}</p>
          <p><strong>Reason:</strong> ${reason || 'Schedule adjustment by adviser'}</p>
        </div>

        <!-- 👤 Adviser Contact — unchanged -->
        <div style="background: #e0f2fe; padding: 20px; border-radius: 12px; border-left: 5px solid #0284c7; margin-top: 1.5rem;">
          <h3 style="margin-top: 0; color: #0f172a;">👤 Your Adviser</h3>
          <p><strong>Name:</strong> ${volunteerName}</p>
          <p style="font-size: 18px;"><strong>📞 Phone:</strong>
            <a href="tel:${volunteerPhone}" style="color: #2563eb; font-weight: 700;">${volunteerPhone}</a>
          </p>
          <p><strong>✉️ Email:</strong>
            <a href="mailto:${volunteerEmail}" style="color: #2563eb;">${volunteerEmail}</a>
          </p>
        </div>

        <p style="color: #6b7280; margin-top: 1.5rem;">All times are in UK time (GMT/BST).</p>

        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; margin-top: 2rem;">
          <p style="font-size: 14px; color: #64748b;">Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
        </div>
      </body>
      </html>
    `
  });
}






async function sendVolunteerCancelEmail(booking, userEmail, reason) {
  let volunteerEmail = null;

  if (booking.volunteer_email) {
    volunteerEmail = booking.volunteer_email;
  }

  if (!volunteerEmail && booking.volunteer_id) {
    try {
      const volunteerDoc = await admin.firestore().collection('volunteers').doc(booking.volunteer_id).get();
      if (volunteerDoc.exists) volunteerEmail = volunteerDoc.data().email;
    } catch (error) {
      console.error('Volunteer lookup failed:', error);
    }
  }

  if (!volunteerEmail) {
    console.error('❌ NO VOLUNTEER EMAIL FOUND! booking.volunteer_id:', booking.volunteer_id);
    return;
  }

  try {
    await transporter.sendMail({
      from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
      to: volunteerEmail,
      subject: `ℹ️ CANCELLED: ${booking.booking_reference}`,
      html: getVolunteerCancelHtml(booking, userEmail, reason)
    });
    console.log(`✅ Volunteer cancel email → ${volunteerEmail}`);
  } catch (error) {
    console.error('❌ EMAIL SEND FAILED:', error);
  }
}


// 🔧 HTML HELPER FUNCTIONS (Extracted for cleaner code)
function getAdminNotificationHtml(booking, start, volunteerName) {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head><body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: white; text-align: center; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        🔔 NEW BOOKING RECEIVED
      </h2>
      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin-top: 0; color: #dc2626;">📋 Booking Details</h3>
        <p><strong>Reference:</strong> ${booking.booking_reference}</p>
        <p><strong>Date:</strong> ${start.dateShort}</p>
        <p><strong>Time:</strong> ${start.time}</p>
        <p><strong>Client:</strong> ${booking.victim_name}</p>
        <p><strong>Client Email:</strong> ${booking.victim_email}</p>
        <p><strong>Client Phone:</strong> ${booking.victim_phone}</p>
        <p><strong>Type:</strong> ${booking.consultation_type === 'phone' ? '📞 Phone Call' : '🏥 In-Person'}</p>
        <p><strong>Category:</strong> ${booking.support_category || 'General'}</p>
        <p><strong>Adviser:</strong> ${volunteerName}</p>
      </div>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        💡 <strong>Action Required:</strong> Check dashboard for full details and Client notes
      </div>
    </div>
    </body></html>
  `;
}


function getAdminStatusChangeHtml(booking, oldStatus, newStatus, color, start, volunteerName) {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head><body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: white; text-align: center; background: linear-gradient(135deg, ${color.border}, #1e293b); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        🔄 BOOKING STATUS UPDATE
      </h2>
      <div style="background: ${color.bg}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${color.border};">
        <h3 style="margin-top: 0; color: ${color.text};">${newStatus.toUpperCase()} — ${booking.booking_reference}</h3>
        <p><strong>Old Status:</strong> ${oldStatus}</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p><strong>Client:</strong> ${booking.victim_name}</p>
        <p><strong>Adviser:</strong> ${volunteerName}</p>
        <p><strong>Date:</strong> ${start.dateShort}</p>
        <p><strong>Time:</strong> ${start.time}</p>
        ${booking.cancelled_by ? `<p><strong>Cancelled by:</strong> ${booking.cancelled_by}</p>` : ''}
        ${booking.cancelled_reason ? `<p><strong>Reason:</strong> ${booking.cancelled_reason}</p>` : ''}
        ${booking.rescheduled_by ? `<p><strong>Rescheduled by:</strong> ${booking.rescheduled_by}</p>` : ''}
      </div>
    </div>
    </body></html>
  `;
}



function getVictimCancelHtml(booking, cancelledBy, reason, start, volunteerName, volunteerEmail, volunteerPhone) {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head><body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">❌ Appointment Cancelled</h2>

      <div style="background: #fee2e2; padding: 20px; border-radius: 12px; border-left: 5px solid #dc2626;">
        <p><strong>Reference:</strong> ${booking.booking_reference}</p>
        <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <p><strong> Date:</strong> ${start.dateShort}</p>
        <p><strong> Time:</strong> ${start.time}</p>
      </div>

      <!-- 👤 Adviser Contact -->
      <div style="background: #e0f2fe; padding: 20px; border-radius: 12px; border-left: 5px solid #0284c7; margin-top: 1.5rem;">
        <h3 style="margin-top: 0; color: #0f172a;">👤 Your Adviser</h3>
        <p><strong>Name:</strong> ${volunteerName}</p>
        <p><strong>📞 Phone:</strong>
          <a href="tel:${volunteerPhone}" style="color: #2563eb; font-weight: 700;">${volunteerPhone}</a>
        </p>
        <p><strong>✉️ Email:</strong>
          <a href="mailto:${volunteerEmail}" style="color: #2563eb;">${volunteerEmail}</a>
        </p>
      </div>

      <p style="text-align: center; margin-top: 2rem;">
        <a href="https://zinthiyatrustsupport.com" style="color: #2563eb; font-size: 16px;">📅 Book a new appointment</a>
      </p>
      <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; margin-top: 1rem;">
        <p style="font-size: 14px; color: #64748b;">Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
      </div>
    </div>
    </body></html>
  `;
}






function getVolunteerCancelHtml(booking, userEmail, reason) {
  // ✅ ADD THIS LINE at the top of the function
  const start = formatUK(booking.start_time);

  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head><body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6b7280;">ℹ️ Booking Cancelled by Client</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; border-left: 5px solid #6b7280;">
        <p><strong>Reference:</strong> ${booking.booking_reference}</p>
        <p><strong>Client Name:</strong> ${booking.victim_name}</p>
        <p><strong>Client Phone:</strong> ${booking.victim_phone}</p>
        <p><strong>Client Email:</strong> ${booking.victim_email}</p>
        <p><strong>Cancelled by:</strong> ${userEmail}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <!-- ✅ ADD THESE TWO LINES -->
        <p><strong> Date:</strong> ${start.dateShort}</p>
        <p><strong> Time:</strong> ${start.time}</p>
        <p><strong>✅ This slot is now available</strong></p>
      </div>
    </div>
    </body></html>
  `;
}





async function sendVolunteerRescheduleEmail(booking, newStartTime, newEndTime, reason) {
  let volunteerEmail = booking.volunteer_email;

  if (!volunteerEmail && booking.volunteer_id) {
    const volunteerDoc = await admin.firestore().collection('volunteers').doc(booking.volunteer_id).get();
    if (volunteerDoc.exists) volunteerEmail = volunteerDoc.data().email;
  }

  if (!volunteerEmail) {
    console.log('⚠️ No volunteer email for reschedule notification');
    return;
  }

  // ✅ ADD THIS LINE — old time before the update
  const oldStart = formatUK(booking.start_time);
  const start = formatUK(newStartTime);
  const end = formatUK(newEndTime);

  await transporter.sendMail({
    from: '"Zinthiya Trust" <noreply@zinthiyatrust.org>',
    to: volunteerEmail,
    subject: `🔄 RESCHEDULED by Client: ${booking.booking_reference}`,
    html: `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">📅 Meeting Rescheduled by Client</h2>

        <!-- ✅ ADD THIS OLD TIME BLOCK -->
        <div style="background: #fee2e2; padding: 20px; border-radius: 12px; border-left: 5px solid #dc2626; margin: 1rem 0;">
          <h3 style="margin-top: 0; color: #dc2626;">❌ Previous Appointment</h3>
          <p><strong>Date:</strong> ${oldStart.dateShort}</p>
          <p><strong>Time:</strong> ${oldStart.time}</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 1rem 0;">
          <h3 style="margin-top: 0;">✅ New Appointment Details</h3>
          <p><strong>Date:</strong> ${start.dateShort}</p>
          <p><strong>Time:</strong> ${start.time} - ${end.time}</p>
          <p><strong>Reference:</strong> ${booking.booking_reference}</p>
          <p><strong>Reason:</strong> ${reason || 'Client requested reschedule'}</p>
        </div>

        <!-- 👤 Client contact block — unchanged -->
        <div style="background: #dbeafe; padding: 20px; border-radius: 12px; border-left: 5px solid #3b82f6; margin: 1rem 0;">
          <h3 style="margin-top: 0; color: #1e40af;">👤 Client Contact</h3>
          <p><strong>Name:</strong> ${booking.victim_name}</p>
          <p style="font-size: 18px;"><strong>📞 Phone:</strong>
            <a href="tel:${booking.victim_phone}" style="color: #2563eb; font-weight: 700;">
              ${booking.victim_phone}
            </a>
          </p>
          <p><strong>Email:</strong> ${booking.victim_email}</p>
        </div>

        <p style="color: #6b7280;">All times are in UK time (GMT/BST).</p>

        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; margin-top: 2rem;">
          <p style="font-size: 14px; color: #64748b;">Zinthiya Ganeshpanchan Trust | 12 Bishop Street, Leicester LE1 6AF | 0116 254 5168</p>
        </div>
      </body>
      </html>
    `
  });
  console.log(`📧 Volunteer reschedule email → ${volunteerEmail}`);
}






// 🔥 VOLUNTEER CANCEL (Frontend) - UPDATE YOUR COLLECTION
exports.sendVolunteerCancelNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { bookingId, reason } = data;
  const volunteerId = context.auth.uid;

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();
  if (booking.status !== 'upcoming' && booking.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel completed booking');
  }

  // ✅ VOLUNTEER CAN ONLY CANCEL THEIR OWN BOOKING
  if (booking.volunteer_id !== volunteerId) {
    throw new functions.https.HttpsError('permission-denied', 'Not your booking');
  }

  await bookingDoc.ref.update({
    status: 'cancelled',
    cancelled_by: context.auth.token.email,
    cancelled_reason: reason,
    cancelled_at: admin.firestore.FieldValue.serverTimestamp()
  });

  // 🔥 SEND NOTIFICATIONS
  await sendVictimCancelEmail(booking, context.auth.token.email, reason);

  await sendAdviserCancelConfirmationEmail(booking, context.auth.token.email, reason);
  return { success: true, message: 'Booking cancelled!' };
});

exports.onEmailRescheduleBooking = functions.https.onRequest(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { bookingId, email, token } = req.query;

  if (!bookingId || !email || !token) {
    return res.status(400).send(`
      <div style="font-family:Arial;max-width:500px;margin:50px auto;text-align:center;padding:40px;">
        <h2 style="color:#dc2626">Invalid reschedule link</h2>
        <p>Missing required parameters.</p>
        <a href="https://zinthiyatrustsupport.com" style="color:#2563eb">Back to Portal</a>
      </div>
    `);
  }

  try {
    // Validate cancel token
    const cancelTokenDoc = await admin.firestore()
      .collection('cancel_tokens').doc(bookingId).get();

    if (
      !cancelTokenDoc.exists ||
      cancelTokenDoc.data().email !== email ||
      cancelTokenDoc.data().token !== token ||
      (Date.now() - cancelTokenDoc.data().createdAt.toMillis()) > 24 * 60 * 60 * 1000
    ) {
      return res.status(400).send(`
        <div style="font-family:Arial;max-width:500px;margin:50px auto;text-align:center;padding:40px;">
          <h2 style="color:#dc2626">Invalid or expired link</h2>
          <p style="color:#64748b">This link expires in 24 hours.</p>
          <a href="https://zinthiyatrustsupport.com" style="color:#2563eb">Back to Portal</a>
        </div>
      `);
    }

    // Validate booking
    const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).send(`<h2>Booking not found</h2>`);
    }

    const booking = bookingDoc.data();
    if (booking.status !== 'active' && booking.status !== 'upcoming') {
      return res.status(400).send(`
        <div style="font-family:Arial;max-width:500px;margin:50px auto;text-align:center;padding:40px;">
          <h2 style="color:#f59e0b">Cannot reschedule</h2>
          <p>This booking is no longer active.</p>
        </div>
      `);
    }

    // ✅ Redirect to your React reschedule page with params
    const redirectUrl = `https://zinthiyatrustsupport.com/booking/${bookingId}/reschedule?email=${encodeURIComponent(email)}&token=${token}`; return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('Reschedule link error:', error);
    return res.status(500).send(`<h2>Server error</h2><p>Please try again.</p>`);
  }
});


// 🔥 VOLUNTEER RESCHEDULE (Frontend) - FULLY FIXED
exports.sendVolunteerRescheduleNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { bookingId, newDate, reason } = data;
  const volunteerId = context.auth.uid;

  console.log('Reschedule called', { bookingId, newDate, reason });

  if (!newDate || typeof newDate !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'newDate must be valid ISO date string');
  }

  const newStartTime = new Date(newDate);
  if (isNaN(newStartTime.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid newDate: ${newDate}`);
  }

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }

  const booking = bookingDoc.data();

  if (booking.volunteer_id !== volunteerId) {
    throw new functions.https.HttpsError('permission-denied', 'Not your booking');
  }

  if (booking.status !== 'upcoming' && booking.status !== 'active' && booking.status !== 'rescheduled') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot reschedule completed/cancelled bookings');
  }

  const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);

  await bookingDoc.ref.update({
    start_time: admin.firestore.Timestamp.fromDate(newStartTime),
    end_time: admin.firestore.Timestamp.fromDate(newEndTime),
    status: 'upcoming',
    rescheduled_by: context.auth.token.email,
    rescheduled_reason: reason || 'Volunteer requested reschedule',
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Booking updated: ${booking.booking_reference} → upcoming`);

  try {
    await sendVictimRescheduleEmail(booking, newStartTime, newEndTime, reason);
  } catch (e) {
    console.error('sendVictimRescheduleEmail failed', e);
  }

  try {
    await sendAdviserRescheduleConfirmationEmail(booking, newStartTime, newEndTime, reason, context.auth.token.email);
  } catch (e) {
    console.error('sendAdviserRescheduleConfirmationEmail failed', e);
  }

  return {
    success: true,
    // ✅ Fixed: added timeZone so message shows UK time, not UTC
    message: `Booking rescheduled to ${newStartTime.toLocaleString('en-GB', { timeZone: 'Europe/London' })}!`
  };
});




// functions/src/index.js
exports.onEmailRateBooking = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  const { bookingId, email, rating, token } = req.query;

  // 🔥 IF RATING PROVIDED = SUBMIT (step 2)
  if (rating) {
    const db = admin.firestore();
    try {
      // Validate token & save rating (same as before)
      const ratingTokenDoc = await db.collection('rating_tokens').doc(bookingId).get();
      if (!ratingTokenDoc.exists || ratingTokenDoc.data().email !== email ||
        ratingTokenDoc.data().rating_token !== token || ratingTokenDoc.data().used === true) {
        return res.status(403).send('<h1>❌ Invalid Link</h1>');
      }

      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) return res.status(404).send('Booking not found');

      const booking = bookingDoc.data();

      // Save rating
      await db.collection('ratings').add({
        booking_id: bookingId, volunteer_id: booking.volunteer_id,
        user_email: email, rating: parseInt(rating), comment: '',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update volunteer average
      const ratingsSnap = await db.collection('ratings')
        .where('volunteer_id', '==', booking.volunteer_id).get();
      const totalRating = ratingsSnap.docs.reduce((sum, doc) => sum + doc.data().rating, 0);
      const avgRating = ratingsSnap.size > 0 ? totalRating / ratingsSnap.size : 0;

      await db.collection('volunteers').doc(booking.volunteer_id).set({
        average_rating: parseFloat(avgRating.toFixed(2)),
        rating_count: ratingsSnap.size
      }, { merge: true });

      // Mark token used
      await db.collection('rating_tokens').doc(bookingId).set({
        used: true, rated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // SUCCESS PAGE
      return res.send(`
        <!DOCTYPE html>
        <html><head><meta name="viewport" content="width=device-width"></head>
        <style>body{margin:0;padding:4rem 2rem;font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#10b981,#059669);color:white;text-align:center;min-height:100vh;display:flex;align-items:center;}.checkmark{font-size:6rem;margin-bottom:1rem;}</style>
        <body><div><div class="checkmark">✅</div><h1 style="font-size:2.5rem;">Thank You!</h1><div style="font-size:3rem;">${'⭐'.repeat(parseInt(rating))}</div><p>Your ${rating}★ rating is recorded</p><button onclick="window.close()" style="background:white;color:#059669;padding:1rem 3rem;border:none;border-radius:50px;font-size:1.1rem;font-weight:600;cursor:pointer;">Close (3s)</button><script>setTimeout(()=>window.close()||window.history.back(),3000);</script></div></body></html>
      `);
    } catch (error) {
      console.error('Rating submit error:', error);
      return res.status(500).send('Error processing rating');
    }
  }

  // 🔥 NO RATING = SHOW INTERACTIVE STARS (step 1)
  const db = admin.firestore();
  const ratingTokenDoc = await db.collection('rating_tokens').doc(bookingId).get();

  if (!ratingTokenDoc.exists || ratingTokenDoc.data().email !== email ||
    ratingTokenDoc.data().rating_token !== token || ratingTokenDoc.data().used === true) {
    return res.status(403).send('<h1>❌ Invalid Rating Link</h1><p>Expired or already used</p>');
  }

  // INTERACTIVE STAR RATING PAGE
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width">
      <title>Rate Your Session</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); 
          min-height: 100vh; padding: 2rem; 
        }
        .container { max-width: 500px; margin: 0 auto; text-align: center; }
        h1 { color: #92400e; font-size: 2.5rem; margin-bottom: 1rem; font-weight: 800; }
        p { color: #92400e; font-size: 1.2rem; margin-bottom: 2rem; }
        .stars-container { margin: 2rem 0; }
        .star { 
          font-size: 4rem; display: inline-block; margin: 0 0.2rem; 
          cursor: pointer; transition: all 0.3s ease; padding: 1rem; 
          border-radius: 50%; background: rgba(255,255,255,0.9);
        }
        .star:hover, .star.selected { color: #fbbf24 !important; transform: scale(1.3); }
        .star.unselected { color: #d1d5db; }
        .submit-btn { 
          background: linear-gradient(135deg, #10b981, #059669); 
          color: white; border: none; padding: 1.5rem 3rem; 
          border-radius: 50px; font-size: 1.3rem; font-weight: 700; 
          cursor: pointer; box-shadow: 0 10px 30px rgba(16,185,129,0.4);
          transition: transform 0.2s;
        }
        .submit-btn:hover { transform: scale(1.05); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rating-text { font-size: 1.5rem; color: #92400e; margin: 1rem 0; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Rate Your Adviser</h1>
        <p>How would you rate your session?</p>
        
        <div class="stars-container">
          <span class="star unselected" onclick="selectRating(1)" title="Poor">⭐</span>
          <span class="star unselected" onclick="selectRating(2)" title="Fair">⭐</span>
          <span class="star unselected" onclick="selectRating(3)" title="Good">⭐</span>
          <span class="star unselected" onclick="selectRating(4)" title="Very Good">⭐</span>
          <span class="star unselected" onclick="selectRating(5)" title="Excellent">⭐</span>
        </div>
        
        <div id="ratingText" class="rating-text" style="display:none;">You selected <span id="selectedRating"></span> stars</div>
        
        <button id="submitBtn" class="submit-btn" onclick="submitRating()" disabled style="opacity:0.5;">
          Submit Rating
        </button>
      </div>

      <script>
        let selectedRating = 0;
        
        function selectRating(rating) {
          selectedRating = rating;
          document.getElementById('ratingText').style.display = 'block';
          document.getElementById('selectedRating').textContent = rating;
          document.getElementById('submitBtn').disabled = false;
          
          // Visual feedback
          document.querySelectorAll('.star').forEach((star, index) => {
            if (index < rating) {
              star.className = 'star selected';
            } else {
              star.className = 'star unselected';
            }
          });
        }
        
        function submitRating() {
          if (selectedRating > 0) {
            // Redirect to same URL with rating parameter
            const url = new URL(window.location.href);
            url.searchParams.set('rating', selectedRating);
            window.location.href = url.toString();
          }
        }
      </script>
    </body>
    </html>
  `);
});



