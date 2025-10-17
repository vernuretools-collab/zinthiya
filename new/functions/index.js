const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true }); // Add this line

admin.initializeApp();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

// Create Booking Function with CORS
exports.createBooking = functions
  .region('europe-west2')
  .https.onCall(async (data, context) => {
    try {
      const bookingRef = admin.firestore().collection('bookings').doc();
      const bookingReference = `ZT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const bookingData = {
        booking_reference: bookingReference,
        volunteer_id: data.volunteer_id,
        support_category: data.support_category,
        consultation_type: data.consultation_type,
        start_time: admin.firestore.Timestamp.fromDate(new Date(data.start_time)),
        end_time: admin.firestore.Timestamp.fromDate(new Date(data.end_time)),
        victim_name: data.victim_name,
        victim_email: data.victim_email,
        victim_phone: data.victim_phone,
        preferred_language: data.preferred_language,
        victim_note: data.victim_note || '',
        status: 'upcoming',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await bookingRef.set(bookingData);

      // Send confirmation email (skip if email config not set)
      try {
        await sendBookingConfirmationEmail(bookingData);
        await sendVolunteerNotificationEmail(data.volunteer_id, bookingData);
      } catch (emailError) {
        console.error('Email error (non-critical):', emailError);
      }

      return {
        success: true,
        booking_id: bookingRef.id,
        booking_reference: bookingReference
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new functions.https.HttpsError('internal', 'Failed to create booking: ' + error.message);
    }
  });

// Send Booking Confirmation Email
async function sendBookingConfirmationEmail(booking) {
  const mailOptions = {
    from: 'Zinthiya Trust <noreply@zinthiyatrust.org>',
    to: booking.victim_email,
    subject: `Appointment Confirmed - ${booking.booking_reference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Appointment is Confirmed!</h2>
        <p>Dear ${booking.victim_name},</p>
        <p>Your appointment with Zinthiya Ganeshpanchan Trust has been confirmed.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Reference:</strong> ${booking.booking_reference}</p>
          <p><strong>Date:</strong> ${booking.start_time.toDate().toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${booking.start_time.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Type:</strong> ${booking.consultation_type === 'phone' ? 'Phone Call' : 'In-Person'}</p>
        </div>

        <p>We look forward to supporting you.</p>
        <p style="color: #6b7280; font-size: 14px;">
          If you need to reschedule or cancel, please contact us at bookings@zinthiyatrust.org
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Zinthiya Ganeshpanchan Trust<br>
          12 Bishop Street, Leicester LE1 6AF<br>
          0116 254 5168
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Send Volunteer Notification Email
async function sendVolunteerNotificationEmail(volunteerId, booking) {
  try {
    const volunteerDoc = await admin.firestore().collection('volunteers').doc(volunteerId).get();
    if (!volunteerDoc.exists) return;

    const volunteer = volunteerDoc.data();

    const mailOptions = {
      from: 'Zinthiya Trust <noreply@zinthiyatrust.org>',
      to: volunteer.email,
      subject: `New Booking - ${booking.booking_reference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Booking Assigned</h2>
          <p>Hello ${volunteer.full_name},</p>
          <p>You have a new booking:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reference:</strong> ${booking.booking_reference}</p>
            <p><strong>Client:</strong> ${booking.victim_name}</p>
            <p><strong>Date:</strong> ${booking.start_time.toDate().toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> ${booking.start_time.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Type:</strong> ${booking.consultation_type === 'phone' ? 'Phone Call' : 'In-Person'}</p>
          </div>

          <p>Please log in to your volunteer portal for full details.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending volunteer notification:', error);
  }
}
