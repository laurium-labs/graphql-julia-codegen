# @generated
# This file was automatically generated and should not be edited.


# The episodes in the Star Wars trilogy
@enum Episode NEWHOPE EMPIRE JEDI


const CreateReviewVariables = @NamedTuple  begin
  episode::Union{Nothing,Episode}
end


const CreateReviewResult_createReview = @NamedTuple begin
  stars::Int64
  commentary::Union{Nothing,AbstractString}
end

const CreateReviewResult = @NamedTuple begin
  createReview::CreateReviewResult_createReview
end
