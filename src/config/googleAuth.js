const passport = require("passport");
const userModel = require("../model/userModel");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// configure passport with google Oauth stategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "https://fashionfactory.in.net/google/callback",
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        console.log("Google profile fetched successfully: ------->", profile);
        let user = await userModel.findOneAndUpdate(
          { email: profile.emails[0].value },
          {
            $set: {
              username: profile.displayName,
            },
          },
          { upsert: true, new: true }
        );
        console.log(user, "Google user authenticated----------->");
        return done(null, user);
      } catch (err) {
        console.error("Error while updating/inserting an user:", err);
        return done(err);
      }
    }
  )
);

// Serializing and deserializing the user
passport.serializeUser(function (user, done) {
  done(null, user._id); // Store user ID in session
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
