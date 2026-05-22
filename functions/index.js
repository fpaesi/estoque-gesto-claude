const admin = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');

admin.initializeApp();

function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'contador_conferente';
}

exports.resetUserPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login obrigatório.');
  }

  const requesterUid = request.auth.uid;
  const requesterDoc = await admin.firestore().collection('perfis').doc(requesterUid).get();
  const requesterRole = normalizeRole(requesterDoc.exists ? requesterDoc.data().role : null);

  if (requesterRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem redefinir senha.');
  }

  const uid = String(request.data?.uid || '').trim();
  const password = String(request.data?.password || '');

  if (!uid || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Informe usuário e senha com pelo menos 6 caracteres.');
  }

  if (uid === requesterUid) {
    throw new HttpsError('invalid-argument', 'Use o fluxo normal para trocar sua própria senha.');
  }

  await admin.auth().updateUser(uid, {password});
  await admin.firestore().collection('perfis').doc(uid).set({
    passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    passwordUpdatedBy: requesterUid
  }, {merge: true});

  return {ok: true};
});
