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
      callbackURL: "/google/callback",
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        console.log("Google profile fetched successfully: ------->", profile);

        let user = await userModel.find({ googleId: profile.id });

        if (!user) {
          user = await userModel.findOne({ email: profile.emails[0].value });
        }

        if (user && !user.status) {
          return done(null, false, { message: "blocked" });
        }

        if (!user) {
          user = new userModel({
            username: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          await user.save();
        }
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
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
